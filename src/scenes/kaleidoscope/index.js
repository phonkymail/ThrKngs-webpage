export { createEngine } from "./engine";
export { defaultParams, presets } from "./presets";
export { randomizeParams } from "./random";
export { default as Controls } from "./Controls";
export const label = "Kal";

// smooth settings Auto (Beat) gently wobbles, with their knob/slider ranges;
// counts are left alone (changing them pops shapes in and out and costs more)
export const modulated = {
  rotationSpeed: [-1, 1],
  fold: [-1, 1],
  glow: [0, 2.5],
  hueSpeed: [0, 1],
  wobble: [0, 1],
  chaos: [0, 1],
  wrongness: [0, 1],
  particleSize: [0.3, 3],
  trailFade: [0.02, 0.6],
  backgroundIntensity: [0, 0.1],
};
