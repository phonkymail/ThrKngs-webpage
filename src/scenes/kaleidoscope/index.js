export { createEngine } from "./engine";
export { defaultParams, presets } from "./presets";
export { randomizeParams } from "./random";
export { default as Controls } from "./Controls";
export const label = "Kal";
export const name = "Kaleidoscope";

// speed settings Random on Beat and Auto (Beat) leave alone, so the motion
// speed stays where the knobs (and the global Speed) put it
export const speedKeys = ["rotationSpeed", "fold", "hueSpeed", "backgroundSpeed"];

// smooth settings Auto (Beat) gently wobbles, with their knob/slider ranges;
// counts are left alone (changing them pops shapes in and out and costs more)
export const modulated = {
  glow: [0, 2.5],
  wobble: [0, 1],
  chaos: [0, 1],
  particleSize: [0.3, 3],
  trailFade: [0.02, 0.6],
  backgroundIntensity: [0, 0.1],
};
