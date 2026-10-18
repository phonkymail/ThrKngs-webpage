export { createEngine } from "./engine";
export { defaultParams, presets } from "./presets";
export { randomizeParams } from "./random";
export { default as Controls } from "./Controls";
export const label = "Spe";
export const name = "Spectrum";

// speed settings Random on Beat and Auto (Beat) leave alone, so the motion
// speed stays where the knobs (and the global Speed) put it
export const speedKeys = ["flowSpeed", "orbit"];

// smooth settings Auto (Beat) gently wobbles, with their knob/slider ranges;
// resolution and depth are left alone (changing them restarts the terrain)
export const modulated = {
  height: [0.2, 2],
  zoom: [0.5, 2.5],
  tilt: [0, 1],
  smoothness: [0, 1],
  glow: [0, 2.5],
  backdrop: [0, 1],
};
