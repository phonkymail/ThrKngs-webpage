// Spectrum: the EQ as a 3D landscape. Every few frames the current spectrum
// becomes a new row at the front of a terrain and older rows recede into the
// distance, so the track's recent past stays visible as hills and valleys.
// Drawn in one of several styles:
// - dots: the terrain as a field of glowing points
// - lines: stacked ridge lines, each hiding the ones behind it
// - mesh: a wireframe of rows and columns
// - bars: a neon skyline of bars over a reflective floor
// - wave: a glowing oscilloscope line with fuzz and fading echoes
// - ring: a twisting ring of ribbons, one per row
// - eq: just the live row, as a classic flat EQ with falling peak caps
// The journey level (levels.energy) sets how tall and lively it gets and how
// low the camera flies; kicks swell the terrain, snares brighten it.
import { rgba, lerpRgba } from "../../lib/color";
import { paletteRgba, addPaletteStops } from "../../lib/palette";
import { motionDrive, drawFlash } from "../../lib/audioDynamics";

export const STYLES = ["dots", "lines", "mesh", "bars", "wave", "ring", "eq"];

// bins at fftSize 1024 / 44.1kHz (~43Hz each): ~43Hz up to ~14kHz, log spaced
const BIN_LO = 1;
const BIN_HI = 325;
// world size of the terrain: x across, z into the screen
const HALF_W = 2;
const DEPTH = 3.4;
const COLOR_STEPS = 12;

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function approach(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.pow(1 - rate, dt));
}

export function createEngine() {
  let width = 0;
  let height = 0;
  let cols = 0;
  // live smoothed spectrum (cols) and its adaptive per-column range
  let cur = new Float32Array(0);
  let floor = new Float32Array(0);
  let ceil = new Float32Array(0);
  // rows of past spectra, newest first
  let history = [];
  let rowTimer = 0;
  let time = 0;
  let camT = 0;
  // camera's angle around the terrain; Orbit is its speed (full turns)
  let orbitAngle = 0;
  // eased audio, so the camera and swell glide instead of twitching
  let swell = 0;
  let bright = 0;
  let journey = 0;
  let palette = { key: null, colors: [] };
  // eq style: each bar's peak cap, which falls back slowly after a hit
  let peaks = new Float32Array(0);

  function setCols(n) {
    cols = n;
    cur = new Float32Array(n);
    peaks = new Float32Array(n);
    floor = new Float32Array(n).fill(0.3);
    ceil = new Float32Array(n).fill(0.6);
    history = [];
  }

  function resize(w, h, params) {
    width = w;
    height = h;
    if (cols !== params.resolution) setCols(params.resolution);
  }

  // the color layers across the columns, quantized so dots can batch by color
  function colorsFor(params) {
    const key = params.palette ? params.palette.join() : params.colorA + params.colorB;
    if (palette.key !== key) {
      palette = { key, colors: Array.from({ length: COLOR_STEPS }, (_, i) => paletteRgba(params, i / (COLOR_STEPS - 1), 1)) };
    }
    return palette.colors;
  }

  // column 0..1 -> its spectrum position 0..1 (bass at 0); mirrored puts
  // the bass in the middle and the highs out at both edges
  function freqPos(u, mirror) {
    return mirror ? Math.abs(u * 2 - 1) : u;
  }

  function sampleSpectrum(spectrum, params, dt) {
    const n = cols;
    const target = new Float32Array(n);
    const logLo = Math.log(BIN_LO);
    const logHi = Math.log(BIN_HI);
    for (let i = 0; i < n; i++) {
      const f = freqPos(n > 1 ? i / (n - 1) : 0, params.mirror);
      let raw;
      if (spectrum) {
        // fractional bin, interpolated so the low end isn't a staircase
        const bin = Math.exp(logLo + (logHi - logLo) * f);
        const b0 = Math.floor(bin);
        const t = bin - b0;
        raw = ((spectrum[b0] ?? 0) * (1 - t) + (spectrum[b0 + 1] ?? 0) * t) / 255;
      } else {
        // no audio: a slow idle swell so the scene is never flat
        raw = 0.25 + 0.12 * Math.sin(time * 0.8 + f * 9) + 0.08 * Math.sin(time * 1.3 - f * 17);
      }
      // a mastered spectrum is tilted and compressed, so each column adapts
      // to its own recent range; part of the raw level keeps loud vs quiet
      floor[i] = approach(floor[i], raw, raw < floor[i] ? 0.08 : 0.002, dt);
      ceil[i] = approach(ceil[i], raw, raw > ceil[i] ? 0.25 : 0.002, dt);
      const norm = clamp01((raw - floor[i]) / Math.max(0.08, ceil[i] - floor[i]));
      target[i] = Math.pow(0.65 * norm + 0.35 * raw, 1.6);
    }
    // blur across columns: smooth rolling hills instead of a jagged comb
    const passes = Math.round(params.smoothness * 4);
    for (let p = 0; p < passes; p++) {
      let prev = target[0];
      for (let i = 1; i < n - 1; i++) {
        const v = target[i];
        target[i] = prev * 0.25 + v * 0.5 + target[i + 1] * 0.25;
        prev = v;
      }
    }
    for (let i = 0; i < n; i++) {
      cur[i] = approach(cur[i], target[i], target[i] > cur[i] ? 0.45 : 0.12, dt);
    }
  }

  function update(dt, params, levels) {
    if (params.resolution !== cols) setCols(params.resolution);
    const react = params.audioReactivity;
    const drive = motionDrive(levels, react);
    time += dt / 60;
    camT += (dt / 60) * drive;
    // ~25s per turn at Orbit 1; calmer passages turn slower
    orbitAngle += (dt / 60) * params.orbit * 0.25 * (0.5 + 0.5 * drive);
    journey = approach(journey, levels.energy || 0, 0.02, dt);
    swell = approach(swell, levels.bass || 0, (levels.bass || 0) > swell ? 0.2 : 0.06, dt);
    bright = approach(bright, levels.mid || 0, (levels.mid || 0) > bright ? 0.25 : 0.06, dt);

    sampleSpectrum(levels.spectrum, params, dt);

    // rows flow away from the camera; a bit faster when the track drives
    const rowsPerSec = (3 + 27 * params.flowSpeed) * (0.7 + 0.5 * journey);
    rowTimer += (dt / 60) * rowsPerSec;
    while (rowTimer >= 1) {
      rowTimer -= 1;
      history.unshift(Float32Array.from(cur));
    }
    const maxRows = params.depth;
    if (history.length > maxRows) history.length = maxRows;
  }

  // ---- camera ------------------------------------------------------------

  function makeCamera(params, flat = false) {
    const tilt = params.tilt;
    // calm: high and distant; driving: swoops lower over the terrain. It
    // always stays above the tallest hills so ridges never flatten into a wall.
    // flat (bars): eye level near the floor, looking almost straight ahead
    const camY = flat
      ? 0.22 + tilt * 0.6 - journey * 0.05
      : 0.4 + tilt * 0.9 + amplitude(params) * 0.6 - journey * 0.1 + Math.sin(camT * 0.11) * 0.04;
    const pitch = flat ? 0.04 + tilt * 0.3 : 0.22 + tilt * 0.5 - journey * 0.05;
    // a gentle sway on top of the orbit, so Orbit 0 still breathes
    const yaw = orbitAngle + Math.sin(camT * 0.07) * 0.12;
    // Zoom is a lens zoom (field of view), so zooming in never flies the
    // camera into the hills
    const f = Math.min(width, height) * 1.05 * zoomLevel(params);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const zc = DEPTH * 0.45;
    // distance to the terrain's center, pulled back when looking from the
    // side, where the terrain is widest; the camera rises with it so the
    // view angle stays the same
    const dist = 2.08 + Math.abs(sinY) * 0.9;
    const lift = dist / 2.08;
    const cx = width / 2;
    const cy = height * 0.5;
    // returns [sx, sy, scale] or null when behind the camera
    return function project(x, y, z, out) {
      const dz = z - zc;
      const rx = x * cosY - dz * sinY;
      const rz = x * sinY + dz * cosY + dist;
      const ry = y - camY * lift;
      const vy = ry * cosP + rz * sinP;
      const vz = -ry * sinP + rz * cosP;
      if (vz < 0.08) return null;
      const s = f / vz;
      out[0] = cx + rx * s;
      out[1] = cy - vy * s;
      out[2] = s;
      return out;
    };
  }

  // Zoom, with Zoom Drift slowly flying in and out on top (~2 min cycle),
  // and a touch closer as the journey builds
  function zoomLevel(params) {
    const drift = (params.zoomDrift ?? 0) * 0.35 * Math.sin(camT * 0.05);
    return Math.max(0.3, (params.zoom ?? 1) * (1 + drift) * (1 + journey * 0.08));
  }

  // looking from behind (orbit past 90 degrees) flips which rows are far
  function rowsBackToFront(rows) {
    const order = [];
    for (let k = rows - 1; k >= 0; k--) order.push(k);
    return Math.cos(orbitAngle) < 0 ? order.reverse() : order;
  }

  // row k (0 = live) -> world z; rows slide back smoothly between pushes
  function rowZ(k, rows) {
    // row 1 starts on top of the live row and slides back from there
    return ((k === 0 ? 0 : k - 1 + rowTimer) / Math.max(1, rows - 2)) * DEPTH;
  }

  function rowData(k) {
    return k === 0 ? cur : history[k - 1];
  }

  function amplitude(params) {
    const react = params.audioReactivity;
    return params.height * 0.55 * (0.4 + 0.6 * journey) * (1 + swell * 0.35 * react);
  }

  // ---- styles ------------------------------------------------------------

  function drawDots(ctx, params) {
    const project = makeCamera(params);
    const amp = amplitude(params);
    const colors = colorsFor(params);
    const rows = Math.min(history.length + 1, params.depth);
    const p = [0, 0, 0];
    const lit = 0.8 + 0.4 * bright * params.audioReactivity;
    ctx.globalCompositeOperation = "lighter";
    for (let k = rows - 1; k >= 0; k--) {
      const data = rowData(k);
      if (!data) continue;
      const z = rowZ(k, params.depth);
      const fade = (1 - k / params.depth) * Math.min(1, (params.depth - k) / 3);
      const alpha = Math.min(1, Math.pow(fade, 0.7) * lit);
      // one path per color bucket keeps the fill calls down; each dot is a
      // faint wide square (the glow) plus a small bright core
      for (let c = 0; c < COLOR_STEPS; c++) {
        ctx.fillStyle = colors[c];
        const i0 = Math.floor((c / COLOR_STEPS) * cols);
        const i1 = Math.floor(((c + 1) / COLOR_STEPS) * cols);
        for (const halo of [true, false]) {
          if (halo && params.glow <= 0) continue;
          const grow = halo ? 1.5 + params.glow : 1;
          ctx.globalAlpha = halo ? alpha * 0.12 * Math.min(1.5, params.glow) : alpha;
          ctx.beginPath();
          for (let i = i0; i < i1; i++) {
            const x = (i / (cols - 1)) * 2 * HALF_W - HALF_W;
            if (!project(x, data[i] * amp, z, p)) continue;
            const r = grow * Math.max(0.8, Math.min(3.4, p[2] * 0.0028 * params.dotSize * (0.8 + data[i] * 0.8)));
            ctx.rect(p[0] - r, p[1] - r, r * 2, r * 2);
          }
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function rowGradient(ctx, params, alpha) {
    return addPaletteStops(ctx.createLinearGradient(0, 0, width, 0), params, alpha);
  }

  // ridge lines back to front; each fills dark below itself so it hides
  // the ridges behind, like a mountain range in silhouette
  function drawLines(ctx, params, withColumns) {
    const project = makeCamera(params);
    const amp = amplitude(params);
    const rows = Math.min(history.length + 1, params.depth);
    const p = [0, 0, 0];
    const lit = 0.75 + 0.45 * bright * params.audioReactivity;
    const xs = new Float32Array(cols);
    const ys = new Float32Array(cols);
    // remembered per row for the mesh's column lines
    const grid = withColumns ? [] : null;
    ctx.lineJoin = "round";
    for (const k of rowsBackToFront(rows)) {
      const data = rowData(k);
      if (!data) continue;
      const z = rowZ(k, params.depth);
      const fade = (1 - k / params.depth) * Math.min(1, (params.depth - k) / 3);
      let ok = true;
      for (let i = 0; i < cols; i++) {
        const x = (i / (cols - 1)) * 2 * HALF_W - HALF_W;
        if (!project(x, data[i] * amp, z, p)) {
          ok = false;
          break;
        }
        xs[i] = p[0];
        ys[i] = p[1];
      }
      if (!ok) continue;
      if (grid) grid.push([Float32Array.from(xs), Float32Array.from(ys), fade]);

      ctx.beginPath();
      ctx.moveTo(xs[0], ys[0]);
      for (let i = 1; i < cols; i++) ctx.lineTo(xs[i], ys[i]);
      if (!withColumns) {
        // close down to the floor and fill to occlude what's behind
        const base = project(0, -0.3, z, p) ? p[1] : height;
        ctx.lineTo(xs[cols - 1], Math.max(base, ys[cols - 1]) + 4);
        ctx.lineTo(xs[0], Math.max(base, ys[0]) + 4);
        ctx.closePath();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(3, 1, 10, 0.92)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(xs[0], ys[0]);
        for (let i = 1; i < cols; i++) ctx.lineTo(xs[i], ys[i]);
      }
      ctx.globalCompositeOperation = "lighter";
      // wide faint pass for the glow, thin bright pass for the core
      ctx.lineWidth = 1 + 3 * params.glow * (1 - k / params.depth);
      ctx.strokeStyle = rowGradient(ctx, params, 0.22 * fade * lit);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rowGradient(ctx, params, Math.min(1, 1.2 * fade * lit));
      ctx.stroke();
    }

    if (grid && grid.length > 1) {
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;
      const step = Math.max(1, Math.round(cols / 40));
      const colors = colorsFor(params);
      for (let i = 0; i < cols; i += step) {
        ctx.strokeStyle = colors[Math.min(COLOR_STEPS - 1, Math.floor((i / cols) * COLOR_STEPS))];
        ctx.globalAlpha = 0.35 * lit;
        ctx.beginPath();
        ctx.moveTo(grid[0][0][i], grid[0][1][i]);
        for (let r = 1; r < grid.length; r++) ctx.lineTo(grid[r][0][i], grid[r][1][i]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // a skyline of bars on a glossy floor, a few rows deep
  function drawBars(ctx, params) {
    const project = makeCamera(params, true);
    const amp = amplitude(params) * 1.1;
    const colors = colorsFor(params);
    const rows = Math.min(history.length + 1, params.depth);
    const p = [0, 0, 0];
    const q = [0, 0, 0];
    const lit = 0.55 + 0.45 * bright * params.audioReactivity;
    const barRows = Math.min(rows, 4);
    const rowStep = Math.max(1, Math.floor(rows / barRows));
    const barW = ((2 * HALF_W) / cols) * 0.62;

    ctx.globalCompositeOperation = "lighter";
    // floor streaks: each column's light smeared toward the viewer
    const front = cur;
    ctx.lineWidth = 1;
    for (let i = 0; i < cols; i++) {
      const x = (i / (cols - 1)) * 2 * HALF_W - HALF_W;
      if (!project(x, 0, DEPTH * 0.55, p) || !project(x * 1.6, 0, -0.4, q)) continue;
      ctx.strokeStyle = colors[Math.min(COLOR_STEPS - 1, Math.floor((i / cols) * COLOR_STEPS))];
      ctx.globalAlpha = (0.05 + 0.3 * front[i]) * lit * params.reflection;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    }

    for (const r of rowsBackToFront(barRows)) {
      const k = r * rowStep;
      const data = rowData(k);
      if (!data) continue;
      // the skyline stands a little way off; older rows step back behind it
      const z = 1 + r * 0.45 + (k === 0 ? 0 : rowTimer * 0.45 / rowStep);
      const fade = 1 - r / (barRows + 0.5);
      for (let i = 0; i < cols; i++) {
        const x = (i / (cols - 1)) * 2 * HALF_W - HALF_W;
        const h = Math.max(0.01, data[i] * amp);
        if (!project(x - barW / 2, 0, z, p) || !project(x + barW / 2, h, z, q)) continue;
        // seen from an angle the face can come out mirrored or thin
        const left = Math.min(p[0], q[0]);
        const w = Math.max(1, Math.abs(q[0] - p[0]));
        const bottom = p[1];
        const top = q[1];
        const col = colors[Math.min(COLOR_STEPS - 1, Math.floor((i / cols) * COLOR_STEPS))];
        ctx.fillStyle = col;
        ctx.globalAlpha = (0.12 + 0.35 * data[i]) * fade * lit;
        ctx.fillRect(left, top, w, bottom - top);
        // bright cap
        ctx.globalAlpha = Math.min(1, (0.4 + 0.5 * data[i]) * fade * lit);
        ctx.fillRect(left, top, w, Math.max(1.5, w * 0.12));
        // reflection on the floor
        if (params.reflection > 0) {
          ctx.globalAlpha = 0.08 * fade * lit * params.reflection;
          ctx.fillRect(left, bottom, w, (bottom - top) * 0.55);
        }
      }
    }
    ctx.globalAlpha = 1;

    // horizon glow line along the back of the floor
    if (project(-HALF_W * 2, 0, DEPTH * 0.6, p) && project(HALF_W * 2, 0, DEPTH * 0.6, q)) {
      const g = ctx.createLinearGradient(p[0], 0, q[0], 0);
      g.addColorStop(0, rgba(params.colorA, 0));
      g.addColorStop(0.5, paletteRgba(params, 0.5, 0.35 * lit));
      g.addColorStop(1, rgba(params.colorB, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    }
  }

  // sample a row at u 0..1 with linear interpolation
  function sampleRow(data, u) {
    const f = u * (cols - 1);
    const i = Math.floor(f);
    const t = f - i;
    return data[i] * (1 - t) + (data[Math.min(cols - 1, i + 1)] ?? 0) * t;
  }

  // a glowing scope line: the spectrum sets how far each part of the line
  // swings, older rows trail behind as faint echoes
  function drawWave(ctx, params) {
    const amp = amplitude(params);
    const cy = height / 2;
    const lit = 0.55 + 0.45 * bright * params.audioReactivity;
    const span = height * 0.32 * amp * zoomLevel(params);
    const step = Math.max(2, Math.round(width / 500));

    // faint grid
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = rgba(params.colorA, 0.07);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const cell = Math.max(40, Math.min(width, height) / 9);
    for (let x = (width / 2) % cell; x < width; x += cell) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = cy % cell; y < height; y += cell) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.globalCompositeOperation = "lighter";
    // fuzz: thin vertical spikes whose reach follows the spectrum
    const colors = colorsFor(params);
    ctx.lineWidth = 1;
    for (let c = 0; c < COLOR_STEPS; c++) {
      ctx.strokeStyle = colors[c];
      ctx.globalAlpha = 0.22 * lit;
      ctx.beginPath();
      const x0 = (c / COLOR_STEPS) * width;
      const x1 = ((c + 1) / COLOR_STEPS) * width;
      for (let x = x0; x < x1; x += step * 1.5) {
        const a = sampleRow(cur, x / width);
        const reach = span * a * (0.3 + 0.7 * Math.abs(Math.sin(x * 12.9898 + time * 23)));
        ctx.moveTo(x, cy - reach);
        ctx.lineTo(x, cy + reach);
      }
      ctx.stroke();
    }

    // echoes first, then the live line on top
    const echoes = Math.min(history.length, 6);
    for (let e = echoes; e >= 0; e--) {
      const data = rowData(e * 2);
      if (!data) continue;
      const fade = 1 - e / (echoes + 1);
      ctx.beginPath();
      for (let x = 0; x <= width; x += step) {
        const u = x / width;
        const a = sampleRow(data, u);
        // carrier frequency rises toward the highs, so it reads like a signal
        const phase = u * (30 + 50 * u) - time * (4 + 3 * journey) - e * 0.6;
        const y = cy + Math.sin(phase) * span * a * (1 - e * 0.08) - e * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const g = rowGradient(ctx, params, 1);
      ctx.strokeStyle = g;
      ctx.globalAlpha = (e === 0 ? 0.25 : 0.12) * fade * lit;
      ctx.lineWidth = 2 + 6 * params.glow;
      ctx.stroke();
      ctx.globalAlpha = (e === 0 ? 1 : 0.35) * fade * lit;
      ctx.lineWidth = e === 0 ? 1.8 : 1;
      ctx.strokeStyle = e === 0 ? lerpRgba(params.colorB, "#ffffff", 0.6, 1) : g;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // a ring of ribbons: each row is one strand, pushed out by its spectrum,
  // strands offset in depth and twist so the ring reads as a 3D shell
  function drawRing(ctx, params) {
    const amp = amplitude(params);
    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) * 0.3 * zoomLevel(params);
    const strands = Math.min(history.length + 1, params.depth, 40);
    const lit = 0.5 + 0.5 * bright * params.audioReactivity;
    const tiltX = 0.35 + params.tilt * 0.6 + Math.sin(camT * 0.09) * 0.15;
    const spinY = orbitAngle * 0.5;
    const cosT = Math.cos(tiltX);
    const sinT = Math.sin(tiltX);
    const f = Math.min(width, height) * 1.4;
    const steps = 180;
    ctx.globalCompositeOperation = "lighter";
    for (let k = strands - 1; k >= 0; k--) {
      const data = rowData(k);
      if (!data) continue;
      const fade = 1 - k / (strands + 1);
      const twist = k * 0.035 + spinY;
      const zOff = (k / strands - 0.5) * R * 0.5;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const th = (s / steps) * Math.PI * 2;
        // map around the circle with a mirror so it closes seamlessly
        const u = Math.abs(((th / Math.PI) % 2) - 1);
        const a = sampleRow(data, params.mirror ? u : s / steps);
        const r = R * (1 + a * amp * 0.45);
        const ang = th + twist;
        const x = Math.cos(ang) * r;
        const y0 = Math.sin(ang) * r;
        // tilt the ring toward the viewer
        const y = y0 * cosT - zOff * sinT;
        const z = y0 * sinT + zOff * cosT + f;
        const sc = f / z;
        const sx = cx + x * sc;
        const sy = cy + y * sc;
        if (s === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = paletteRgba(params, k / Math.max(1, strands - 1), 1);
      ctx.globalAlpha = 0.12 * fade * lit;
      ctx.lineWidth = 1 + 3 * params.glow;
      ctx.stroke();
      ctx.globalAlpha = 0.6 * fade * lit;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // the classic EQ: one row of bars standing on a floor line, a peak cap
  // over each that lingers then falls, and a faded mirror image below
  function drawEq(ctx, params, dt) {
    const colors = colorsFor(params);
    const zoom = zoomLevel(params);
    const lit = 0.75 + 0.35 * bright * params.audioReactivity;
    const span = Math.min(width * 0.86, width * 0.6 * zoom);
    const left = (width - span) / 2;
    const slot = span / cols;
    const barW = Math.max(1, slot * 0.68);
    const floorY = height * 0.62;
    const maxH = height * 0.42 * zoom;
    const amp = amplitude(params) / 0.55;
    const capH = Math.max(1.5, Math.min(4, barW * 0.25));

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < cols; i++) {
      const v = Math.min(1, cur[i] * amp);
      peaks[i] = Math.max(v, peaks[i] - 0.006 * dt);
      const h = Math.max(1, v * maxH);
      const x = left + i * slot + (slot - barW) / 2;
      ctx.fillStyle = colors[Math.min(COLOR_STEPS - 1, Math.floor((i / cols) * COLOR_STEPS))];
      if (params.glow > 0) {
        const g = barW * 0.6 * params.glow;
        ctx.globalAlpha = 0.1 * lit * Math.min(1, params.glow);
        ctx.fillRect(x - g, floorY - h - g, barW + g * 2, h + g);
      }
      ctx.globalAlpha = (0.45 + 0.45 * v) * lit;
      ctx.fillRect(x, floorY - h, barW, h);
      // peak cap
      ctx.globalAlpha = Math.min(1, 0.9 * lit);
      ctx.fillRect(x, floorY - peaks[i] * maxH - capH - 2, barW, capH);
      if (params.reflection > 0) {
        ctx.globalAlpha = 0.12 * lit * params.reflection;
        ctx.fillRect(x, floorY + 2, barW, h * 0.45);
      }
    }
    // floor line
    ctx.globalAlpha = 0.5 * lit;
    ctx.strokeStyle = addPaletteStops(ctx.createLinearGradient(left, 0, left + span, 0), params, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, floorY + 1);
    ctx.lineTo(left + span, floorY + 1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // a soft colored haze behind everything, brighter as the journey builds
  function drawBackdrop(ctx, params) {
    const cx = width / 2;
    const cy = height * 0.45;
    const r = Math.hypot(width, height) * 0.6;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const a = params.backdrop * (0.1 + 0.15 * journey);
    g.addColorStop(0, paletteRgba(params, 0.5, a));
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  function draw(ctx, params, levels, dt = 1) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(2, 0, 8, ${1 - params.trails})`;
    ctx.fillRect(0, 0, width, height);
    drawBackdrop(ctx, params);

    const style = params.style;
    if (style === "lines") drawLines(ctx, params, false);
    else if (style === "mesh") drawLines(ctx, params, true);
    else if (style === "bars") drawBars(ctx, params);
    else if (style === "wave") drawWave(ctx, params);
    else if (style === "ring") drawRing(ctx, params);
    else if (style === "eq") drawEq(ctx, params, dt);
    else drawDots(ctx, params);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    drawFlash(ctx, width, height, params.colorB, levels, params.audioReactivity * (params.hitFx ?? 1));
  }

  return { resize, update, draw };
}
