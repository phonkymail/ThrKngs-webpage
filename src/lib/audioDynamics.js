// Turns raw analyser bands into envelopes the scenes can react to. Raw byte
// levels on a mastered track sit high and in a narrow range (bass ~0.65-0.8),
// so everything here adapts to the track's own range rather than fixed values:
// - bass/mid/treble: normalized 0..1 between each band's running floor and
//   ceiling, fast attack / slower release so hits snap in and ease out
// - loudness: slow loudness 0..1 relative to the loudest recent passage
// - pace: how busy the drums are, from hits per second over the last ~8s —
//   half-time and slow sections read low, driving sections high
// - energy: the "journey" — pace and loudness blended and slowed down a lot,
//   so the visuals build over several seconds into a section and settle
//   again after it. Hit envelopes are scaled by it too: calm passages only
//   breathe, the full reaction is saved for the peaks.
// - punch: bass onset (spectral flux spike) that decays quickly
// - onset: this frame's flux relative to its running average (0 if no hit),
//   for anything that wants to trigger on beats
// In "highs" mode the bands and onsets come from the high-mid and high end
// instead (bass-heavy mixes otherwise make every kick drive the visuals):
// bass -> 1.5-4kHz, mid -> 4-8kHz, treble -> 8-14kHz, onsets from 1.5-8kHz.
// In "drums" mode the visuals follow kick and snare hits instead of the EQ:
// each drum has its own onset detector, and a hit snaps its envelope up and
// lets it decay. bass -> kick, mid/treble -> snare, overall -> either, punch
// and onset fire on both (kicks a little harder).
import { rgba } from "./color";

const BANDS = ["bass", "mid", "treble", "overall"];
// bin ranges at fftSize 1024 / 44.1kHz (~43Hz per bin)
const FLUX_RANGE = { full: [0, 12], highs: [35, 186] }; // ~0-500Hz / ~1.5-8kHz
const HIGH_BANDS = { bass: [35, 93], mid: [93, 186], treble: [186, 325] };
// drum bins: kick ~43-170Hz; snare body ~170-300Hz and crack ~1.5-5kHz
const KICK_BINS = [[1, 4]];
const SNARE_BINS = [[4, 7], [35, 116]];
const SNARE_WEIGHTS = [0.35, 0.65]; // mostly the crack, body keeps hats out
const DRUM_RATIO = 2.2;
const DRUM_GAP_MS = 110;
const ONSET_RATIO = 2.5; // ~1-2 hits/s on kick-driven music
const MIN_ONSET_GAP_MS = 150;
const PACE_WINDOW_MS = 8000;
// hits/s that read as fully calm / fully driving (kick + snare combined)
const PACE_CALM = 0.5;
const PACE_BUSY = 3.5;

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// frame-rate independent exponential approach; rate is per 60fps frame
function approach(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.pow(1 - rate, dt));
}

function makeRange() {
  return { floor: 0.3, ceil: 0.5, env: 0 };
}

// floor drops fast / rises slow, ceiling rises fast / drops slow, so the
// window hugs the band's recent spread
function normalize(range, v, dt) {
  range.floor = approach(range.floor, v, v < range.floor ? 0.1 : 0.002, dt);
  range.ceil = approach(range.ceil, v, v > range.ceil ? 0.3 : 0.002, dt);
  return clamp01((v - range.floor) / Math.max(0.05, range.ceil - range.floor));
}

// Spectral-flux onset detector over a few bin ranges, with its own running
// average so quiet and loud drums both register relative to the track.
function createOnsetTracker(binRanges, weights = binRanges.map(() => 1)) {
  const prev = new Float32Array(512);
  let havePrev = false;
  let avg = 0.01;
  let lastAt = -Infinity;
  return {
    reset() {
      havePrev = false;
    },
    // returns the onset ratio this frame, or 0 if no hit
    step(spectrum, now, dt) {
      let flux = 0;
      binRanges.forEach(([a, b], i) => {
        let f = 0;
        for (let k = a; k < b; k++) {
          if (havePrev) f += Math.max(0, spectrum[k] - prev[k]);
          prev[k] = spectrum[k];
        }
        flux += (f / ((b - a) * 255)) * weights[i];
      });
      if (!havePrev) {
        havePrev = true;
        return 0;
      }
      const ratio = flux / (avg + 0.002);
      avg = approach(avg, flux, 0.03, dt);
      if (ratio > DRUM_RATIO && now - lastAt > DRUM_GAP_MS) {
        lastAt = now;
        return ratio;
      }
      return 0;
    },
  };
}

export function createDynamics() {
  const ranges = Object.fromEntries(BANDS.map((b) => [b, makeRange()]));
  const prevBins = new Float32Array(512);
  let havePrev = false;
  let lastMode = null;
  let fluxAvg = 0.01;
  let lastOnsetAt = -Infinity;
  let loudSlow = 0;
  let loudCeil = 0.35;
  let energy = 0;
  let punch = 0;
  const kickTracker = createOnsetTracker(KICK_BINS);
  const snareTracker = createOnsetTracker(SNARE_BINS, SNARE_WEIGHTS);
  let kickEnv = 0;
  let snareEnv = 0;
  const hitTimes = [];
  let pace = 0;
  let intensity = 0;
  let lastNow = null;
  let last = null;

  // Called by every per-frame consumer; rAF callbacks in the same frame share
  // a timestamp, so the second caller gets the cached result instead of
  // advancing the envelopes twice.
  function bandAvg(spectrum, [a, b]) {
    let sum = 0;
    const end = Math.min(b, spectrum.length);
    for (let k = a; k < end; k++) sum += spectrum[k];
    return end > a ? sum / (end - a) / 255 : 0;
  }

  return function process(getLevels, now, mode = "full") {
    if (now === lastNow && last) return last;
    const dt = lastNow === null ? 1 : Math.min(3, (now - lastNow) / (1000 / 60));
    lastNow = now;

    let raw = getLevels();
    if (mode === "highs" && raw.spectrum) {
      const bass = bandAvg(raw.spectrum, HIGH_BANDS.bass);
      const mid = bandAvg(raw.spectrum, HIGH_BANDS.mid);
      const treble = bandAvg(raw.spectrum, HIGH_BANDS.treble);
      raw = { bass, mid, treble, overall: (bass + mid + treble) / 3, spectrum: raw.spectrum };
    }
    // switching modes compares different bins, so restart the onset tracking
    if (mode !== lastMode) {
      lastMode = mode;
      havePrev = false;
      kickTracker.reset();
      snareTracker.reset();
    }
    const out = { spectrum: raw.spectrum, onset: 0 };

    for (const band of BANDS) {
      const r = ranges[band];
      const n = normalize(r, raw[band] || 0, dt);
      r.env = approach(r.env, n, n > r.env ? 0.6 : 0.12, dt);
      out[band] = r.env;
    }

    const overall = raw.overall || 0;
    loudSlow = approach(loudSlow, overall, 0.02, dt);
    loudCeil = Math.max(loudSlow, approach(loudCeil, loudSlow, 0.0005, dt));
    energy = clamp01((loudSlow - 0.08) / Math.max(0.1, loudCeil - 0.08));
    out.loudness = energy * energy; // spread the upper range so loud vs louder still differs

    const spectrum = raw.spectrum;
    if (mode === "drums") {
      const kickHit = spectrum ? kickTracker.step(spectrum, now, dt) : 0;
      const snareHit = spectrum ? snareTracker.step(spectrum, now, dt) : 0;
      kickEnv *= Math.pow(0.86, dt);
      snareEnv *= Math.pow(0.82, dt);
      // a hit's strength sets how high its envelope jumps (0.55..1)
      if (kickHit) kickEnv = Math.max(kickEnv, 0.55 + 0.45 * clamp01((kickHit - DRUM_RATIO) / 3));
      if (snareHit) snareEnv = Math.max(snareEnv, 0.55 + 0.45 * clamp01((snareHit - DRUM_RATIO) / 3));
      out.bass = kickEnv;
      out.mid = snareEnv;
      out.treble = snareEnv;
      out.overall = Math.max(kickEnv, snareEnv);
      if (kickHit || snareHit) {
        out.onset = Math.max(kickHit, snareHit);
        punch = Math.max(punch, kickHit ? kickEnv : snareEnv * 0.8);
      }
    } else if (spectrum) {
      const [f0, f1] = FLUX_RANGE[mode] ?? FLUX_RANGE.full;
      let flux = 0;
      for (let k = f0; k < f1; k++) {
        if (havePrev) flux += Math.max(0, spectrum[k] - prevBins[k]);
        prevBins[k] = spectrum[k];
      }
      flux /= (f1 - f0) * 255;
      if (havePrev) {
        const ratio = flux / (fluxAvg + 0.002);
        if (ratio > ONSET_RATIO && now - lastOnsetAt > MIN_ONSET_GAP_MS) {
          lastOnsetAt = now;
          out.onset = ratio;
          punch = Math.max(punch, clamp01((ratio - 1.5) / 3));
        }
        fluxAvg = approach(fluxAvg, flux, 0.03, dt);
      }
      havePrev = true;
    } else {
      havePrev = false;
    }
    punch *= Math.pow(0.86, dt);
    out.punch = punch;

    if (out.onset) hitTimes.push(now);
    while (hitTimes.length && now - hitTimes[0] > PACE_WINDOW_MS) hitTimes.shift();
    const rate = hitTimes.length / (PACE_WINDOW_MS / 1000);
    pace = approach(pace, clamp01((rate - PACE_CALM) / (PACE_BUSY - PACE_CALM)), 0.02, dt);
    out.pace = pace;
    // builds up over ~6s, settles over ~3s
    const target = clamp01(0.55 * pace + 0.45 * out.loudness);
    intensity = approach(intensity, target, target > intensity ? 0.003 : 0.006, dt);
    out.energy = intensity;

    // calm passages get a soft version of every hit
    const hitScale = 0.3 + 0.7 * intensity;
    for (const band of BANDS) out[band] *= hitScale;
    out.punch *= hitScale;

    last = out;
    return out;
  };
}

// Overall motion multiplier: slow and dreamy when quiet, surging when loud.
export function motionDrive(levels, react) {
  return 0.3 + (levels.energy * 1.5 + levels.punch * 0.6) * react;
}

// Hits only shake/flash hard when the track is also loud.
function kick(levels, react) {
  return levels.punch * (0.25 + 0.75 * levels.energy) * react;
}

export function applyShake(ctx, levels, react, amount = 3) {
  const k = kick(levels, react);
  if (k < 0.3) return; // only the hardest hits
  ctx.translate((Math.random() * 2 - 1) * k * amount, (Math.random() * 2 - 1) * k * amount);
}

export function drawFlash(ctx, width, height, hex, levels, react) {
  const k = kick(levels, react);
  if (k < 0.1) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = rgba(hex, Math.min(0.2, k * 0.16));
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
