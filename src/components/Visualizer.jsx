import { useEffect, useRef, useState } from "react";
import { scenes } from "../scenes";
import { createModulator } from "../lib/modulation";
import { createColorizer } from "../lib/palette";

export default function Visualizer({ sceneKey, params, colorFx, getFrame, onClick, speed = 1, filter, paused = false, modulation = 0 }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const paramsRef = useRef(params);
  const getFrameRef = useRef(getFrame);
  const rafRef = useRef(null);

  paramsRef.current = params;
  const colorFxRef = useRef(colorFx);
  colorFxRef.current = colorFx;
  const [colorize] = useState(createColorizer);
  getFrameRef.current = getFrame;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  // skip drawing while hidden behind the store, but keep the loop alive
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // how much Auto (Beat) wobbles the settings right now (0 = off)
  const modulationRef = useRef(modulation);
  modulationRef.current = modulation;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const engine = scenes[sceneKey].createEngine();
    const modulate = createModulator();
    engineRef.current = engine;

    function resize() {
      // shadowBlur (used for glow) is one of the most expensive canvas ops and
      // its cost scales with backing-store pixel count, so cap DPR modestly
      // rather than rendering at full retina resolution
      // phones/tablets get 1x: their GPUs struggle with blur at high-DPR sizes
      const coarse = window.matchMedia?.("(pointer: coarse)").matches;
      const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.resize(w, h, paramsRef.current);
    }
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();

    function frame(now) {
      const deltaSeconds = Math.min((now - last) / 1000, 0.05);
      last = now;
      const dt = deltaSeconds * 60 * speedRef.current; // 60fps-equivalent step, scaled by master speed

      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const levels = getFrameRef.current(now);
      const colors = colorize(colorFxRef.current, levels, now, dt);
      const p = { ...modulate(paramsRef.current, scenes[sceneKey].modulated, modulationRef.current, dt, levels.energy), ...colors };
      engine.update(dt, p, levels);
      engine.draw(ctx, p, levels, dt);

      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey]);

  return (
    <canvas
      ref={canvasRef}
      onClick={onClick}
      className="absolute inset-0 block h-full w-full cursor-pointer touch-manipulation"
      style={{ background: "#000", filter }}
    />
  );
}
