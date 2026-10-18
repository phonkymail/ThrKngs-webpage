// The global color pipeline. The Colors tab holds up to four layer colors;
// every frame they go through the Color FX (hue shift, saturation, neon
// boost, auto cycle, hue drift, beat steps) and reach the engines as:
// - params.palette / paletteRgb: the active layers, in order
// - params.colorA / colorB: the first and last layer, for single-color uses
// Engines sample gradients across the layers with paletteRgba.
import { hexToRgb, rand, randInt, hslToHex } from "./color";

const LAYER_KEYS = ["colorA", "colorB", "colorC", "colorD"];
// recompute at most this often: some engines rebuild glow sprites when a
// color changes, so a smoothly cycling palette updates in small steps
const UPDATE_MS = 50;
const BEAT_GAP_MS = 1500;

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function mixRgb(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function rgbToHex({ r, g, b }) {
  const h = (x) =>
    Math.round(Math.max(0, Math.min(255, x)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// the layer colors in use, as hex
export function layerColors(g) {
  const n = Math.max(2, Math.min(4, g.colorLayers ?? 2));
  return LAYER_KEYS.slice(0, n).map((k) => g[k]);
}

// a color between the palette's layers; t 0..1 runs first -> last layer
export function paletteRgba(params, t, a) {
  const pal = params.paletteRgb;
  if (!pal) {
    const ca = hexToRgb(params.colorA);
    const cb = hexToRgb(params.colorB);
    return rgbaOf(mixRgb(ca, cb, clamp01(t)), a);
  }
  const f = clamp01(t) * (pal.length - 1);
  const i = Math.min(pal.length - 2, Math.floor(f));
  return rgbaOf(mixRgb(pal[i], pal[i + 1], f - i), a);
}

function rgbaOf({ r, g, b }, a) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

// the layers as gradient stops on a canvas gradient
export function addPaletteStops(grad, params, alpha) {
  const pal = params.palette ?? [params.colorA, params.colorB];
  pal.forEach((_, i) => grad.addColorStop(i / (pal.length - 1), paletteRgba(params, i / (pal.length - 1), alpha)));
  return grad;
}

// hue shift / saturation / neon on one color; neon pulls it toward a fully
// saturated, bright-but-not-white tone so it glows on the dark background
function transform(hex, hueShift, saturation, neon) {
  let [h, s, l] = rgbToHsl(hexToRgb(hex));
  h = (((h + hueShift) % 360) + 360) % 360;
  s = Math.min(100, s * saturation);
  s += (100 - s) * neon;
  l += (58 - l) * neon * 0.8;
  return hslToHex(h, s, l);
}

// Per-frame colorizer: keeps the auto cycle / drift / beat phases between
// frames and returns the colors the engines draw with.
export function createColorizer() {
  let cycle = 0; // in layers: 1 = every color moved one layer along
  let beatTarget = 0;
  let beatPhase = 0;
  let drift = 0; // degrees
  let lastBeat = -Infinity;
  let lastAt = -Infinity;
  let key = "";
  let out = null;

  return function colorize(fx, levels, now, dt) {
    const energy = levels.energy || 0;
    // both drift faster as the track builds
    const pace = 0.4 + 0.9 * energy;
    cycle += (dt / 60) * fx.colorCycle * 0.12 * pace;
    drift += (dt / 60) * fx.hueDrift * 6 * pace;
    if (fx.beatColor && levels.onset > 0 && (levels.punch || 0) > 0.15 && now - lastBeat > BEAT_GAP_MS) {
      lastBeat = now;
      beatTarget += 1;
    }
    beatPhase += (beatTarget - beatPhase) * Math.min(1, 0.08 * dt);

    const base = layerColors(fx);
    const nextKey = base.join() + fx.hueShift + fx.saturation + fx.neon;
    const moving = fx.colorCycle > 0 || fx.hueDrift > 0 || Math.abs(beatTarget - beatPhase) > 0.001;
    if (out && nextKey === key && (!moving || now - lastAt < UPDATE_MS)) return out;
    key = nextKey;
    lastAt = now;

    const rgb = base.map((hex) => hexToRgb(transform(hex, fx.hueShift + drift, fx.saturation, fx.neon)));
    const n = rgb.length;
    // the cycle slides every layer along the palette, wrapping around
    const shift = cycle + beatPhase;
    const pal = rgb.map((_, i) => {
      const f = (((i + shift) % n) + n) % n;
      const j = Math.floor(f);
      return mixRgb(rgb[j], rgb[(j + 1) % n], f - j);
    });
    const palette = pal.map(rgbToHex);
    out = { palette, paletteRgb: pal, colorA: palette[0], colorB: palette[n - 1] };
    return out;
  };
}

// Random palettes from a few color-harmony schemes; "neon" is the most
// common pick and is all fully saturated, bright hues.
const SCHEMES = {
  neon: (h) => [h, h + rand(90, 150), h + rand(180, 220), h + rand(260, 320)].map((x) => [x, rand(92, 100), rand(52, 62)]),
  complementary: (h) => [
    [h, rand(70, 95), rand(45, 60)],
    [h + 180, rand(70, 95), rand(45, 60)],
    [h + 20, rand(60, 90), rand(60, 72)],
    [h + 200, rand(60, 90), rand(30, 45)],
  ],
  triadic: (h) => [h, h + 120, h + 240, h + 60].map((x) => [x, rand(70, 95), rand(45, 62)]),
  analogous: (h) => [h - 40, h - 15, h + 15, h + 40].map((x) => [x, rand(70, 95), rand(42, 64)]),
  split: (h) => [h, h + 150, h + 210, h + 30].map((x) => [x, rand(70, 95), rand(45, 62)]),
  mono: (h) => [rand(30, 40), rand(45, 55), rand(60, 70), rand(75, 85)].map((l) => [h + rand(-8, 8), rand(70, 95), l]),
};
const SCHEME_WEIGHTS = [
  ["neon", 3],
  ["complementary", 1],
  ["triadic", 1],
  ["analogous", 1],
  ["split", 1],
  ["mono", 0.5],
];

export function randomPalette() {
  const total = SCHEME_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let pick = rand(0, total);
  let scheme = "neon";
  for (const [name, w] of SCHEME_WEIGHTS) {
    pick -= w;
    if (pick <= 0) {
      scheme = name;
      break;
    }
  }
  const colors = SCHEMES[scheme](randInt(0, 359)).map(([h, s, l]) => hslToHex(((h % 360) + 360) % 360, Math.min(100, s), l));
  return Object.fromEntries(LAYER_KEYS.map((k, i) => [k, colors[i]]));
}

// a preset or scene randomizer only brings A and B: fill C and D with
// neighbors of them so 3- and 4-layer palettes stay in the same family
export function extendColors({ colorA, colorB }) {
  const [ha, sa, la] = rgbToHsl(hexToRgb(colorA));
  const [hb, sb, lb] = rgbToHsl(hexToRgb(colorB));
  return {
    colorA,
    colorB,
    colorC: hslToHex((ha + 35) % 360, sa, Math.min(80, la + 10)),
    colorD: hslToHex((hb + 325) % 360, sb, Math.max(25, lb - 8)),
  };
}
