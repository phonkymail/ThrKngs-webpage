// Settings shared by every scene (the "Global" tab in the controls panel).
export const defaultGlobal = {
  // colors used by both scenes; presets set them, randomize may too
  colorA: "#ff2a06",
  colorB: "#ff9466",
  randomColors: true,

  // beat-driven automation
  autoRandomize: false,
  beatSensitivity: 1.6,
  beatGap: 4,
  autoScene: false,
  sceneInterval: 30,

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
