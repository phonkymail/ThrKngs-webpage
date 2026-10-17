// Nebula + constellation visualizer: a field of slowly floating stars, with
// thin lines linking nearby "node" stars, around a central spectralizer.
// It follows the music through motion rather than light (no flashes/blinks):
// - bass hits send shockwave rings out from the center that shove stars
//   outward; they spring back, so the field breathes with the kick
// - loudness spins the field into a galaxy swirl (faster near the center)
// - fast-moving stars leave streaks, so drops read as warp speed
import { rand, lerpRgba } from "../../lib/color";
import { motionDrive } from "../../lib/audioDynamics";
import { LOGO_STROKES } from "../../lib/logo";

function makeDrifter(w, h) {
  const x = rand(0, w);
  const y = rand(0, h);
  return {
    x,
    y,
    angle: rand(0, Math.PI * 2),
    speed: rand(0.1, 0.4),
    wobble: rand(0.15, 0.5),
    phase: rand(0, Math.PI * 2),
    twinklePhase: rand(0, Math.PI * 2),
    twinkleSpeed: rand(0.3, 1),
    // displacement from the drifting "home" position, pushed by shockwaves
    ox: 0,
    oy: 0,
    vx: 0,
    vy: 0,
    // where the star was drawn last frame / is drawn this frame, for streaks
    px: null,
    py: null,
    rx: x,
    ry: y,
  };
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const MAX_WAVES = 6;
const WAVE_BAND = 36;

function pickDir() {
  return Math.random() < 0.5 ? 1 : -1;
}

// "cw" / "ccw" pin the direction; "auto" (or unset) leaves it to the coin
function dirFor(mode, coin) {
  if (mode === "cw") return 1;
  if (mode === "ccw") return -1;
  return coin;
}

// a star of the second layer: fixed polar position on a disc covering the
// whole screen, spun rigidly about the center by its own clock
function makeOrbiter(w, h) {
  const maxR = Math.hypot(w, h) / 2;
  return {
    r: Math.sqrt(Math.random()) * maxR,
    theta: rand(0, Math.PI * 2),
    size: rand(0.6, 1.7),
    hue: Math.random(),
    twinklePhase: rand(0, Math.PI * 2),
    twinkleSpeed: rand(0.3, 1),
    ox: 0,
    oy: 0,
    vx: 0,
    vy: 0,
    x: 0,
    y: 0,
  };
}

export function createEngine() {
  let width = 0;
  let height = 0;
  let time = 0;
  let dust = [];
  let nodes = [];
  let waves = [];
  // spin direction: a 50/50 coin flip per load, re-flipped every so often;
  // `spinDir` eases toward the target so the galaxy slows, stops and reverses
  let spinTarget = pickDir();
  let spinDir = spinTarget;
  let nextFlip = rand(20, 45);
  let spin = 0;
  let lastSpinSeed;
  let orbiters = [];
  // fold travel (tunnel flight), eased toward the Fold knob; >0 flies outward
  let foldVel = 0;
  // the second layer runs its own coin and its own randomly drifting speed
  let l2Coin = pickDir();
  let l2SpeedTarget = rand(0.3, 1);
  let l2Vel = 0;
  let l2NextRoll = rand(15, 35);

  function resize(w, h, params) {
    width = w;
    height = h;
    dust = new Array(params.dustCount).fill(0).map(() => makeDrifter(w, h));
    nodes = new Array(params.nodeCount).fill(0).map(() => ({ ...makeDrifter(w, h), size: rand(1.6, 3.2) }));
    orbiters = new Array(params.layer2Count ?? 0).fill(0).map(() => makeOrbiter(w, h));
  }

  function setCount(arr, count, factory) {
    if (count > arr.length) {
      for (let i = arr.length; i < count; i++) arr.push(factory());
    } else {
      arr.length = count;
    }
  }

  function stepDrifter(d, dt, floatSpeed) {
    d.phase += dt * 0.01;
    d.angle += Math.sin(d.phase) * 0.01 * dt;
    const v = d.speed * floatSpeed;
    d.x += Math.cos(d.angle) * v * dt;
    d.y += Math.sin(d.angle) * v * dt * 0.6;

    const margin = 40;
    const off = d.x < -margin || d.x > width + margin || d.y < -margin || d.y > height + margin;
    // flying outward, a star leaving the screen is reborn near the center
    if (off && foldVel > 0.0005) {
      respawnCenter(d);
      return;
    }
    if (d.x < -margin) d.x = width + margin;
    if (d.x > width + margin) d.x = -margin;
    if (d.y < -margin) d.y = height + margin;
    if (d.y > height + margin) d.y = -margin;
  }

  function respawnCenter(d) {
    const a = rand(0, Math.PI * 2);
    const r = rand(0.02, 0.2) * Math.min(width, height);
    d.x = width / 2 + Math.cos(a) * r;
    d.y = height / 2 + Math.sin(a) * r;
    d.respawned = true;
  }

  // somewhere just inside the screen border, for stars falling inward
  function respawnEdge(d) {
    const t = Math.random() * 2 * (width + height);
    if (t < width) [d.x, d.y] = [t, 0];
    else if (t < width * 2) [d.x, d.y] = [t - width, height];
    else if (t < width * 2 + height) [d.x, d.y] = [0, t - width * 2];
    else [d.x, d.y] = [width, t - width * 2 - height];
    d.respawned = true;
  }

  // tunnel flight: move the home position radially, faster the further out,
  // so stars creep away from the center and rush past the edge
  function stepFold(d, dt, cx, cy) {
    if (Math.abs(foldVel) < 0.00005) return;
    const hx = d.x - cx;
    const hy = d.y - cy;
    const hr = Math.hypot(hx, hy) || 1;
    const minR = Math.min(width, height) * 0.03;
    const step = foldVel * (hr + minR) * dt;
    d.x += (hx / hr) * step;
    d.y += (hy / hr) * step;
    if (foldVel < 0 && hr < minR) respawnEdge(d);
  }

  function stepStar(d, dt, floatSpeed, swirl, cx, cy, swirlR) {
    stepDrifter(d, dt, floatSpeed);
    stepFold(d, dt, cx, cy);

    // galaxy swirl: rotate the home position about the center, faster inside,
    // fading out before the screen edge so nothing gets flung across the wrap
    const hx = d.x - cx;
    const hy = d.y - cy;
    const hr = Math.hypot(hx, hy);
    if (swirl !== 0 && hr < swirlR && hr > 1) {
      const w = swirl * (1 - smoothstep(swirlR * 0.55, swirlR, hr)) * (0.35 + 0.65 * (1 - hr / swirlR)) * dt;
      const c = Math.cos(w);
      const s = Math.sin(w);
      d.x = cx + hx * c - hy * s;
      d.y = cy + hx * s + hy * c;
    }

    // shockwaves push outward as the ring passes the star
    const sx = d.x + d.ox - cx;
    const sy = d.y + d.oy - cy;
    const sr = Math.hypot(sx, sy) || 1;
    for (const wave of waves) {
      const diff = Math.abs(sr - wave.r);
      if (diff < WAVE_BAND) {
        const k = wave.strength * (1 - diff / WAVE_BAND) * 2.4 * dt;
        d.vx += (sx / sr) * k;
        d.vy += (sy / sr) * k;
      }
    }

    // spring back home, damped, so the field swells and settles
    d.vx = (d.vx - d.ox * 0.02 * dt) * Math.pow(0.9, dt);
    d.vy = (d.vy - d.oy * 0.02 * dt) * Math.pow(0.9, dt);
    d.ox += d.vx * dt;
    d.oy += d.vy * dt;

    d.px = d.rx;
    d.py = d.ry;
    d.rx = d.x + d.ox;
    d.ry = d.y + d.oy;
    // no streak across the jump back to the center/edge
    if (d.respawned) {
      d.px = d.rx;
      d.py = d.ry;
      d.respawned = false;
    }
  }

  function update(dt, params, levels) {
    // everything that moves rides one audio-driven clock
    const react = params.audioReactivity;
    const drive = motionDrive(levels, react);
    time += (dt / 60) * drive;
    nextFlip -= dt / 60;
    // a randomize (by hand or on beat) re-flips the coin too
    const seedChanged = params.spinSeed !== lastSpinSeed;
    lastSpinSeed = params.spinSeed;
    if (nextFlip <= 0 || seedChanged) {
      spinTarget = pickDir();
      nextFlip = rand(20, 45);
    }
    l2NextRoll -= dt / 60;
    if (l2NextRoll <= 0 || seedChanged) {
      l2Coin = pickDir();
      l2SpeedTarget = rand(0.3, 1);
      l2NextRoll = rand(15, 35);
    }
    const target = dirFor(params.spinMode, spinTarget);
    spinDir += (target - spinDir) * Math.min(1, 0.008 * dt);
    spin += (dt / 60) * drive * spinDir;
    const cx = width / 2;
    const cy = height / 2;

    if (levels.onset > 0 && levels.punch > 0.12 && params.shockwave > 0) {
      waves.push({ r: Math.min(width, height) * params.spectralizerSize, strength: levels.punch * react * params.shockwave });
      if (waves.length > MAX_WAVES) waves.shift();
    }
    const maxR = Math.hypot(width, height) / 2;
    for (const wave of waves) wave.r += (7 + 12 * wave.strength) * dt;
    waves = waves.filter((wave) => wave.r < maxR + WAVE_BAND);

    const fold = params.fold ?? 0;
    // a kick gives the flight a little jump to light speed
    const foldTarget = (fold * 0.012 + Math.sign(fold) * levels.punch * 0.01 * react) * drive;
    foldVel += (foldTarget - foldVel) * Math.min(1, 0.05 * dt);

    const swirl = (0.0015 + levels.energy * 0.012) * react * params.swirl * spinDir;
    const swirlR = Math.min(width, height) * 0.5;
    if (params.dustCount !== dust.length) {
      setCount(dust, params.dustCount, () => makeDrifter(width, height));
    }
    if (params.nodeCount !== nodes.length) {
      setCount(nodes, params.nodeCount, () => ({ ...makeDrifter(width, height), size: rand(1.6, 3.2) }));
    }
    for (const d of dust) stepStar(d, dt, params.floatSpeed * drive, swirl, cx, cy, swirlR);
    for (const n of nodes) stepStar(n, dt, params.floatSpeed * drive, swirl, cx, cy, swirlR);

    const l2Count = params.layer2Count ?? 0;
    if (l2Count !== orbiters.length) setCount(orbiters, l2Count, () => makeOrbiter(width, height));
    const l2Target = (params.layer2Speed ?? 0.5) * l2SpeedTarget * dirFor(params.layer2Mode, l2Coin) * 0.004;
    l2Vel += (l2Target - l2Vel) * Math.min(1, 0.006 * dt);
    for (const o of orbiters) stepOrbiter(o, dt, l2Vel * drive, cx, cy);
  }

  function stepOrbiter(o, dt, angVel, cx, cy) {
    o.theta += angVel * dt;
    if (Math.abs(foldVel) >= 0.00005) {
      const maxR = Math.hypot(width, height) / 2;
      const minR = Math.min(width, height) * 0.03;
      o.r += foldVel * (o.r + minR) * dt;
      if (o.r > maxR) o.r = rand(0.02, 0.2) * Math.min(width, height);
      else if (o.r < minR) o.r = maxR * rand(0.85, 1);
    }
    const hx = cx + Math.cos(o.theta) * o.r;
    const hy = cy + Math.sin(o.theta) * o.r;
    // shockwaves shove this layer too, so it still feels part of the scene
    const sx = hx + o.ox - cx;
    const sy = hy + o.oy - cy;
    const sr = Math.hypot(sx, sy) || 1;
    for (const wave of waves) {
      const diff = Math.abs(sr - wave.r);
      if (diff < WAVE_BAND) {
        const k = wave.strength * (1 - diff / WAVE_BAND) * 1.6 * dt;
        o.vx += (sx / sr) * k;
        o.vy += (sy / sr) * k;
      }
    }
    o.vx = (o.vx - o.ox * 0.02 * dt) * Math.pow(0.9, dt);
    o.vy = (o.vy - o.oy * 0.02 * dt) * Math.pow(0.9, dt);
    o.ox += o.vx * dt;
    o.oy += o.vy * dt;
    o.x = hx + o.ox;
    o.y = hy + o.oy;
  }

  function drawBackground(ctx) {
    ctx.fillStyle = "#020103";
    ctx.fillRect(0, 0, width, height);
  }

  function drawVignette(ctx) {
    const cx = width / 2;
    const cy = height / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.75);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.7, "rgba(0,0,0,0.1)");
    grad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawDust(ctx, params, levels) {
    // gentle: fast twinkling on treble read as blinking
    const twinkleSpeed = 1 + levels.treble * 0.4 * params.audioReactivity;
    const streakLen = params.streaks * 8;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineWidth = 1.4;
    for (const d of dust) {
      d.twinklePhase += 0.02 * d.twinkleSpeed * twinkleSpeed;
      const alpha = 0.25 + 0.55 * params.twinkle * (0.5 + 0.5 * Math.sin(d.twinklePhase));
      ctx.globalAlpha = alpha;
      const mx = d.px === null ? 0 : d.rx - d.px;
      const my = d.py === null ? 0 : d.ry - d.py;
      const speed = Math.hypot(mx, my);
      // a streak behind fast stars; skip the jump when a star wraps an edge
      if (streakLen > 0 && speed > 0.5 && speed < 60) {
        const len = Math.min(48, speed * streakLen);
        ctx.beginPath();
        ctx.moveTo(d.rx - (mx / speed) * len, d.ry - (my / speed) * len);
        ctx.lineTo(d.rx, d.ry);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(d.rx, d.ry, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawOrbiters(ctx, params) {
    if (orbiters.length === 0) return;
    const op = params.layer2Opacity ?? 0.6;
    for (const o of orbiters) {
      o.twinklePhase += 0.02 * o.twinkleSpeed;
      ctx.fillStyle = lerpRgba(params.colorA, params.colorB, o.hue, op * (0.45 + 0.4 * Math.sin(o.twinklePhase)));
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawConstellation(ctx, params, levels) {
    const react = params.audioReactivity;
    // links reach further as the track gets louder; follows the slow energy
    // envelope only, so links don't pop on and off with every beat
    const linkDist = params.linkDistance * (0.85 + levels.energy * 0.35 * react);
    const linkDist2 = linkDist * linkDist;
    const linkOpacity = params.linkOpacity;
    const glowBoost = 1 + levels.mid * 0.25 * react;
    // nodes swell with the bass (size only, brightness stays put)
    const swell = 1 + levels.bass * 0.45 * react;

    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.rx - b.rx;
        const dy = a.ry - b.ry;
        const d2 = dx * dx + dy * dy;
        if (d2 > linkDist2) continue;
        const t = 1 - Math.sqrt(d2) / linkDist;
        ctx.globalAlpha = Math.min(1, t * linkOpacity);
        ctx.strokeStyle = "#e8ecff";
        const dashed = (i * 31 + j * 17) % 5 === 0;
        ctx.setLineDash(dashed ? [4, 5] : []);
        ctx.beginPath();
        ctx.moveTo(a.rx, a.ry);
        ctx.lineTo(b.rx, b.ry);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    for (const n of nodes) {
      n.twinklePhase += 0.015 * n.twinkleSpeed;
      const alpha = 0.7 + 0.25 * Math.sin(n.twinklePhase);
      ctx.shadowColor = "#e8ecff";
      ctx.shadowBlur = 10 * params.glow * glowBoost;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(n.rx, n.ry, n.size * (0.8 + 0.4 * (glowBoost - 1)) * swell, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function sampleBars(spectrum, barCount) {
    const out = new Array(barCount).fill(0);
    const n = spectrum ? spectrum.length : 0;
    if (n === 0) return out;
    for (let i = 0; i < barCount; i++) {
      const t0 = Math.pow(i / barCount, 1.8);
      const t1 = Math.pow((i + 1) / barCount, 1.8);
      const startBin = Math.floor(t0 * n);
      const endBin = Math.max(startBin + 1, Math.floor(t1 * n));
      let sum = 0;
      let count = 0;
      for (let b = startBin; b < endBin && b < n; b++) {
        sum += spectrum[b];
        count++;
      }
      out[i] = count ? sum / count / 255 : 0;
    }
    return out;
  }

  function drawRadialBars(ctx, params, bars, cx, cy, baseR, maxLen) {
    const op = params.spectralizerOpacity;
    const rotation = spin * 0.05;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, (Math.PI * 2 * baseR) / bars.length / 3);
    for (let i = 0; i < bars.length; i++) {
      const avg = bars[i];
      const angle = (i / bars.length) * Math.PI * 2 - Math.PI / 2 + rotation;
      const len = Math.max(baseR * 0.02, avg * maxLen);
      const x0 = cx + Math.cos(angle) * baseR;
      const y0 = cy + Math.sin(angle) * baseR;
      const x1 = cx + Math.cos(angle) * (baseR + len);
      const y1 = cy + Math.sin(angle) * (baseR + len);

      const col = lerpRgba(params.colorA, params.colorB, i / bars.length, op * (0.15 + 0.55 * avg));
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8 * params.glow * avg * op;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }

  function drawRadialDots(ctx, params, bars, cx, cy, baseR, maxLen) {
    const op = params.spectralizerOpacity;
    const rotation = spin * 0.03;
    for (let i = 0; i < bars.length; i++) {
      const avg = bars[i];
      const angle = (i / bars.length) * Math.PI * 2 - Math.PI / 2 + rotation;
      const r = baseR + avg * maxLen;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const size = 1 + avg * 3;

      const col = lerpRgba(params.colorA, params.colorB, i / bars.length, op * (0.2 + 0.5 * avg));
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6 * params.glow * avg * op;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWaveRing(ctx, params, bars, cx, cy, baseR, maxLen) {
    const op = params.spectralizerOpacity;
    const rotation = spin * 0.04;
    ctx.beginPath();
    for (let i = 0; i <= bars.length; i++) {
      const avg = bars[i % bars.length];
      const angle = (i / bars.length) * Math.PI * 2 - Math.PI / 2 + rotation;
      const r = baseR + avg * maxLen * 0.8;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const lineCol = lerpRgba(params.colorA, params.colorB, 0.5, op * 0.6);
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 1.25;
    ctx.shadowColor = lineCol;
    ctx.shadowBlur = 8 * params.glow * op;
    ctx.stroke();

    ctx.fillStyle = lerpRgba(params.colorA, params.colorB, 0.5, op * 0.06);
    ctx.fill();
  }

  function drawMirrorBars(ctx, params, bars, cx, cy, baseR, maxLen) {
    const op = params.spectralizerOpacity;
    const totalWidth = baseR * 4.5;
    const barW = totalWidth / bars.length;
    const startX = cx - totalWidth / 2;
    for (let i = 0; i < bars.length; i++) {
      const avg = bars[i];
      const h = Math.max(1.5, avg * maxLen * 0.6);
      const x = startX + i * barW + barW * 0.15;
      const w = Math.max(1, barW * 0.7);

      const col = lerpRgba(params.colorA, params.colorB, i / bars.length, op * (0.15 + 0.5 * avg));
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 5 * params.glow * avg * op;
      ctx.fillRect(x, cy - h, w, h * 2);
    }
  }

  // the ThrKngs mark as glowing light-painting strokes that swell with the
  // music, with flares at the stroke ends kicking on the beat
  function drawLogo(ctx, params, cx, cy, baseR, levels) {
    const op = params.spectralizerOpacity;
    const overall = levels.overall || 0;
    const punch = levels.punch || 0;
    const r = baseR * 1.5;
    const pt = ([x, y]) => [cx + x * r, cy + y * r];

    // the mark itself, white-hot like the light trails on the cover
    const core = lerpRgba(params.colorB, "#ffffff", 0.75, op * (0.7 + 0.3 * overall));
    ctx.strokeStyle = core;
    ctx.shadowColor = lerpRgba(params.colorA, params.colorB, 0.5, 1);
    ctx.shadowBlur = (12 + 20 * overall) * params.glow * op;
    ctx.lineWidth = Math.max(1.5, r * 0.035 * (1 + overall * 0.3));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (const stroke of LOGO_STROKES) {
      stroke.forEach((p, i) => {
        const [x, y] = pt(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    }
    ctx.stroke();

    // bright flares at the stroke ends, kicking with the beat
    ctx.fillStyle = `rgba(255,255,255,${op * (0.8 + 0.2 * punch)})`;
    const dot = r * 0.04 * (1 + punch * 1.2);
    for (const stroke of LOGO_STROKES) {
      for (const p of [stroke[0], stroke[stroke.length - 1]]) {
        const [x, y] = pt(p);
        ctx.beginPath();
        ctx.arc(x, y, dot, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawSpectralizer(ctx, params, levels) {
    if (params.spectralizerStyle === "off") return;
    const bars = sampleBars(levels.spectrum, params.spectralizerBars);
    const cx = width / 2;
    const cy = height / 2;
    const react = params.audioReactivity;
    const breathe = 1 + (levels.bass * 0.2 + levels.punch * 0.15) * react;
    const baseR = Math.min(width, height) * params.spectralizerSize * breathe;
    const maxLen = baseR * 1.9 * params.spectralizerSensitivity;

    ctx.save();
    if (params.spectralizerStyle === "radial-dots") {
      drawRadialDots(ctx, params, bars, cx, cy, baseR, maxLen);
    } else if (params.spectralizerStyle === "wave-ring") {
      drawWaveRing(ctx, params, bars, cx, cy, baseR, maxLen);
    } else if (params.spectralizerStyle === "mirror-bars") {
      drawMirrorBars(ctx, params, bars, cx, cy, baseR, maxLen);
    } else if (params.spectralizerStyle === "logo") {
      drawLogo(ctx, params, cx, cy, baseR, levels);
    } else {
      drawRadialBars(ctx, params, bars, cx, cy, baseR, maxLen);
    }

    if (params.spectralizerStyle === "radial-bars" || params.spectralizerStyle === "radial-dots") {
      const overall = levels.overall || 0;
      const op = params.spectralizerOpacity;
      const coreR = baseR * (0.6 + overall * 0.3);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, lerpRgba(params.colorA, params.colorB, 0.5, op * (0.3 + 0.25 * overall)));
      coreGrad.addColorStop(1, lerpRgba(params.colorA, params.colorB, 0.5, 0));
      ctx.shadowBlur = 0;
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawWaves(ctx, params) {
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.hypot(width, height) / 2;
    ctx.lineWidth = 1.2;
    for (const wave of waves) {
      // fades smoothly as it travels out; never pops in bright
      const fade = Math.pow(Math.max(0, 1 - wave.r / maxR), 1.5);
      ctx.strokeStyle = lerpRgba(params.colorA, params.colorB, wave.r / maxR, Math.min(0.25, wave.strength * 0.4) * fade);
      ctx.beginPath();
      ctx.arc(cx, cy, wave.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function draw(ctx, params, levels) {
    // no shake, flash or brightness pumping here: the music shows up as motion
    drawBackground(ctx);
    drawVignette(ctx);
    drawWaves(ctx, params);
    drawOrbiters(ctx, params);
    drawDust(ctx, params, levels);
    drawConstellation(ctx, params, levels);
    drawSpectralizer(ctx, params, levels);
  }

  return { resize, update, draw };
}
