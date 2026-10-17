// Gentle per-setting wobble for Auto (Beat): each modulated setting drifts
// around its own value on two slow, out-of-sync sine waves, so the picture
// keeps evolving between beat randomizes. Applied per frame to the params
// the engine draws with; the stored settings (and the knobs) stay put.

// share of each setting's full knob range it can drift at Modulation 1
const MAX_SWING = 0.12;

function makeLfo() {
  return {
    f1: 0.05 + Math.random() * 0.1, // cycles per second: ~7-20s periods
    f2: 0.13 + Math.random() * 0.15,
    p1: Math.random() * Math.PI * 2,
    p2: Math.random() * Math.PI * 2,
  };
}

export function createModulator() {
  const lfos = {};
  let t = 0;
  let depth = 0;

  // dt in 60fps frames; target 0..1 (0 when Auto is off) is eased toward,
  // so the wobble fades in and out over a couple of seconds
  return function modulate(params, ranges, target, dt, energy = 0) {
    depth += (target - depth) * Math.min(1, 0.02 * dt);
    // louder passages wobble a little faster
    t += (dt / 60) * (1 + energy * 0.6);
    if (!ranges || depth < 0.001) return params;

    const out = { ...params };
    for (const key in ranges) {
      const v = params[key];
      if (typeof v !== "number") continue;
      const [min, max] = ranges[key];
      const l = (lfos[key] ??= makeLfo());
      const wave = 0.65 * Math.sin(t * l.f1 * Math.PI * 2 + l.p1) + 0.35 * Math.sin(t * l.f2 * Math.PI * 2 + l.p2);
      out[key] = Math.max(min, Math.min(max, v + wave * (max - min) * MAX_SWING * depth));
    }
    return out;
  };
}
