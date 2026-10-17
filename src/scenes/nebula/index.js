export { createEngine } from "./engine";
export { defaultParams, presets } from "./presets";
export { randomizeParams } from "./random";
export { default as Controls } from "./Controls";
export const label = "Neb";
export const name = "Nebula";

// smooth settings Auto (Beat) gently wobbles, with their knob/slider ranges;
// counts are left alone (changing them pops stars in and out and costs more)
export const modulated = {
  floatSpeed: [0, 1],
  twinkle: [0, 1.5],
  glow: [0, 2.5],
  swirl: [0, 2],
  fold: [-1, 1],
  shockwave: [0, 2],
  streaks: [0, 1.5],
  linkDistance: [40, 300],
  linkOpacity: [0, 1],
  layer2Speed: [0, 1],
  layer2Opacity: [0, 1],
  spectralizerSize: [0.04, 0.35],
  spectralizerSensitivity: [0.2, 3],
  spectralizerOpacity: [0.05, 1],
};
