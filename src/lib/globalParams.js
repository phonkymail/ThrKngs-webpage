// Settings shared by every scene (the "Global" tab in the controls panel).
export const defaultGlobal = {
  // layer colors used by every scene; presets set A and B (C and D follow
  // them), randomize may set all four
  colorA: "#ff2a06",
  colorB: "#ff9466",
  colorC: "#ff5c1f",
  colorD: "#ffd0a0",
  // how many of the four layers the scenes' gradients run through
  colorLayers: 2,
  randomColors: true,
  // Color FX, applied live on top of the layer colors (see lib/palette)
  hueShift: 0,
  saturation: 1,
  neon: 0,
  colorCycle: 0,
  hueDrift: 0,
  beatColor: false,

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

  // what drives the visuals: "drums" (kick and snare hits), "highs"
  // (high-mid and up, so the heavy bass doesn't trigger everything) or "full"
  reactBand: "drums",

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

// four layer colors each; with fewer layers only the first ones are used
export const palettes = {
  Ember: ["#ff2a06", "#ff9466", "#ff5c1f", "#ffd0a0"],
  Blood: ["#d91a00", "#6e1a3a", "#ff3d2e", "#2a0a14"],
  Gold: ["#ffb02f", "#ff2a06", "#ffe08a", "#c45a00"],
  Ash: ["#c9b8a6", "#5a4a40", "#8c7b6e", "#e8ddd0"],
  Indigo: ["#4b5bcf", "#c94b8f", "#2a2f7a", "#ff7ab8"],
  Neon: ["#2fe3ff", "#ff2fd0", "#7a2fff", "#2fff9e"],
  Synthwave: ["#ff2fb4", "#7a2fff", "#2fd4ff", "#ffb02f"],
  Cyberpunk: ["#fcee0a", "#00f0ff", "#ff003c", "#7a00ff"],
  Acid: ["#b6ff00", "#00ff9c", "#fff200", "#00c3ff"],
  Laser: ["#ff0055", "#00ffd5", "#ff00ff", "#3d5cff"],
  Miami: ["#ff6ec7", "#00e5ff", "#ffb86b", "#8a5cff"],
  Toxic: ["#39ff14", "#00ffcc", "#ccff00", "#00a86b"],
  Ultraviolet: ["#8a2be2", "#ff00ff", "#3d00ff", "#00e5ff"],
  Electric: ["#00a2ff", "#00ffea", "#2b00ff", "#9ff0ff"],
  Lava: ["#ff3c00", "#ffcc00", "#ff007b", "#ff7a00"],
};

// CSS filter that dims/ages the scene canvas
export function sceneFilter(g) {
  return `sepia(${g.sepia}) saturate(${Math.max(0, 1 - g.sepia)}) brightness(${g.exposure}) contrast(1.06)`;
}
