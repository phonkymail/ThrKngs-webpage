import { rand, randInt, hslToHex } from "../../lib/color";
import { MOTIF_SHAPES } from "./engine";

const shapeChoices = [...MOTIF_SHAPES, "mixed"];

export function randomizeParams() {
  const hueA = rand(0, 360);
  const hueB = (hueA + rand(60, 200)) % 360;

  return {
    colorA: hslToHex(hueA, rand(60, 95), rand(45, 65)),
    colorB: hslToHex(hueB, rand(60, 95), rand(45, 65)),
    segments: randInt(4, 18),
    mirror: Math.random() < 0.85,
    rotationSpeed: Math.random() < 0.25 ? 0 : rand(-0.8, 0.8),
    fold: Math.random() < 0.3 ? 0 : rand(-0.6, 0.9),
    streakCount: randInt(0, 14),
    particlesPerWedge: randInt(2, 10),
    particleSize: rand(0.5, 2),
    wobble: rand(0.15, 0.9),
    hueSpeed: rand(0.05, 0.55),
    glow: rand(0.5, 2),
    trailFade: rand(0.04, 0.32),
    audioReactivity: rand(0.3, 1.3),
    chaos: rand(0, 0.7),
    shapeCount: randInt(0, 6),
    arcCount: randInt(0, 6),
    motifCount: randInt(0, 7),
    motifShape: shapeChoices[Math.floor(Math.random() * shapeChoices.length)],
    sparkleCount: randInt(0, 20),
    backgroundIntensity: rand(0, 0.1),
    backgroundSpeed: rand(0.05, 0.5),
  };
}
