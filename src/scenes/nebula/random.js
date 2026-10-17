import { rand, randInt, hslToHex } from "../../lib/color";

const SPECTRALIZER_STYLES = ["radial-bars", "radial-dots", "wave-ring", "mirror-bars", "logo"];

export function randomizeParams() {
  const hueA = rand(0, 360);
  const hueB = (hueA + rand(60, 200)) % 360;

  return {
    colorA: hslToHex(hueA, rand(55, 90), rand(38, 62)),
    colorB: hslToHex(hueB, rand(55, 90), rand(38, 62)),
    dustCount: randInt(5, 60) * 10,
    nodeCount: randInt(10, 100),
    floatSpeed: rand(0.05, 0.8),
    twinkle: rand(0.2, 1.3),
    linkDistance: randInt(50, 260),
    linkOpacity: rand(0.15, 0.9),
    glow: rand(0.4, 2),
    audioReactivity: rand(0.5, 1.3),
    swirl: rand(0.3, 1.6),
    fold: Math.random() < 0.3 ? 0 : rand(-0.6, 0.9),
    // a fresh value tells the engine to re-flip its spin direction coin
    spinSeed: Math.random(),
    layer2Count: randInt(0, 40) * 10,
    layer2Speed: rand(0.15, 1),
    layer2Opacity: rand(0.3, 0.9),
    shockwave: rand(0.5, 1.5),
    streaks: rand(0.2, 1.2),
    spectralizerStyle: Math.random() < 0.9 ? SPECTRALIZER_STYLES[randInt(0, SPECTRALIZER_STYLES.length - 1)] : "off",
    spectralizerBars: randInt(16, 100),
    spectralizerSize: rand(0.06, 0.28),
    spectralizerSensitivity: rand(0.4, 2),
    spectralizerOpacity: rand(0.2, 0.8),
  };
}
