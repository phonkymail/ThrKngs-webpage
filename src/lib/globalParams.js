// Settings shared by every scene (the "Global" tab in the controls panel).
export const defaultGlobal = {
  // colors used by both scenes; presets set them, randomize may too
  colorA: "#ff2a06",
  colorB: "#ff9466",
  randomColors: true,

  // beat-driven automation
  autoRandomize: false,
  // last picked Random on Beat level (1-5), see beatLevels
  beatLevel: 3,
  beatSensitivity: 1.6,
  beatGap: 4,
  // how much Auto (Beat) also gently wobbles each scene's smooth settings
  modulation: 0.5,
  autoScene: false,
  sceneInterval: 30,

  // which part of the spectrum drives the visuals: "highs" (high-mid and
  // up, so the heavy bass doesn't trigger everything) or "full"
  reactBand: "highs",

  // master multipliers on top of each scene's own settings
  masterReact: 1,
  masterSpeed: 1,
  hitFx: 1,

  // vintage look (scene filter + patina overlay)
  exposure: 0.72,
  sepia: 0.3,
  grain: 0.08,
  vignette: 1,

  volume: 0.9,
  autoHideUi: true,
};

// Random on Beat levels, 1 (calm) to 5 (wild): each sets how easily a beat
// triggers a randomize, the minimum time between them, how much the scene
// drifts in between, and how hard the visuals react. Level 3 is the defaults.
export const beatLevels = {
  1: { beatSensitivity: 2.6, beatGap: 12, modulation: 0.2, masterReact: 0.6 },
  2: { beatSensitivity: 2.1, beatGap: 8, modulation: 0.35, masterReact: 0.8 },
  3: { beatSensitivity: 1.6, beatGap: 4, modulation: 0.5, masterReact: 1 },
  4: { beatSensitivity: 1.35, beatGap: 2.5, modulation: 0.7, masterReact: 1.3 },
  5: { beatSensitivity: 1.15, beatGap: 1.5, modulation: 0.9, masterReact: 1.6 },
};

// scene Audio React per level (the same 1-5 scale, 0 is Off), picked from
// the scene buttons in the top bar
export const reactLevels = { 0: 0, 1: 0.2, 2: 0.45, 3: 0.75, 4: 1.1, 5: 1.5 };

export const palettes = {
  Ember: ["#ff2a06", "#ff9466"],
  Blood: ["#d91a00", "#6e1a3a"],
  Gold: ["#ffb02f", "#ff2a06"],
  Ash: ["#c9b8a6", "#5a4a40"],
  Indigo: ["#4b5bcf", "#c94b8f"],
  Neon: ["#2fe3ff", "#ff2fd0"],
};

// CSS filter that dims/ages the scene canvas
export function sceneFilter(g) {
  return `sepia(${g.sepia}) saturate(${Math.max(0, 1 - g.sepia)}) brightness(${g.exposure}) contrast(1.06)`;
}
