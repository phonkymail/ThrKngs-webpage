// Turns raw analyser bands into envelopes the scenes can react to. Raw byte
// levels on a mastered track sit high and in a narrow range (bass ~0.65-0.8),
// so everything here adapts to the track's own range rather than fixed values:
// - bass/mid/treble: normalized 0..1 between each band's running floor and
//   ceiling, fast attack / slower release so hits snap in and ease out
// - energy: slow loudness 0..1 relative to the loudest recent passage —
//   breakdowns read soft, drops read aggressive
// - punch: bass onset (spectral flux spike) that decays quickly
// - onset: this frame's flux relative to its running average (0 if no hit),
//   for anything that wants to trigger on beats
// In "highs" mode the bands and onsets come from the high-mid and high end
// instead (bass-heavy mixes otherwise make every kick drive the visuals):
// bass -> 1.5-4kHz, mid -> 4-8kHz, treble -> 8-14kHz, onsets from 1.5-8kHz.
import { rgba } from "./color";

const BANDS = ["bass", "mid", "treble", "overall"];
// bin ranges at fftSize 1024 / 44.1kHz (~43Hz per bin)
const FLUX_RANGE = { full: [0, 12], highs: [35, 186] }; // ~0-500Hz / ~1.5-8kHz
const HIGH_BANDS = { bass: [35, 93], mid: [93, 186], treble: [186, 325] };
const ONSET_RATIO = 2.5; // ~1-2 hits/s on kick-driven music
const MIN_ONSET_GAP_MS = 150;

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
    out.energy = energy * energy; // spread the upper range so loud vs louder still differs

    const spectrum = raw.spectrum;
    if (spectrum) {
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

    last = out;
    return out;
  };
}

// Overall motion multiplier: slow and dreamy when quiet, surging when loud.
export function motionDrive(levels, react) {
  return 0.35 + (levels.energy * 1.6 + levels.punch * 1.2) * react;
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
