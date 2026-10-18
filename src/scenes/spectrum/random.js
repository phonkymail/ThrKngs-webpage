import { rand, randInt, hslToHex } from "../../lib/color";
import { STYLES } from "./engine";

export function randomizeParams() {
  const hueA = rand(0, 360);
  const hueB = (hueA + rand(60, 200)) % 360;

  return {
    colorA: hslToHex(hueA, rand(60, 95), rand(45, 65)),
    colorB: hslToHex(hueB, rand(60, 95), rand(45, 65)),
    style: STYLES[randInt(0, STYLES.length - 1)],
    resolution: randInt(40, 110),
    depth: randInt(20, 50),
    height: rand(0.6, 1.5),
    zoom: rand(0.8, 1.4),
    zoomDrift: rand(0, 0.8),
    tilt: rand(0.05, 0.7),
    smoothness: rand(0.2, 1),
    dotSize: rand(0.6, 1.6),
    glow: rand(0.4, 1.8),
    reflection: rand(0.4, 1.2),
    backdrop: rand(0.2, 1),
    mirror: Math.random() < 0.5,
    audioReactivity: rand(0.5, 1.2),
  };
}
