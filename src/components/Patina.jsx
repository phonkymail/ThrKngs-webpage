import { useEffect, useRef } from "react";

// Vintage film overlay drawn on its own canvas above the scene: grain,
// warm vignette, projector flicker, the odd scratch and dust speck. Kept off
// the scene canvas so it never accumulates into the kaleidoscope's trails.
// The scene itself is dimmed/aged by a CSS filter (see sceneFilter).

const GRAIN_TILE = 192;
const GRAIN_FRAMES = 6;
const GRAIN_FPS = 18; // film grain reads better at a "projector" rate than 60fps

function makeGrainTile() {
  const c = document.createElement("canvas");
  c.width = GRAIN_TILE;
  c.height = GRAIN_TILE;
  const g = c.getContext("2d");
  const img = g.createImageData(GRAIN_TILE, GRAIN_TILE);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export default function Patina({ grain, vignette }) {
  const canvasRef = useRef(null);
  const settingsRef = useRef({ grain, vignette });
  settingsRef.current = { grain, vignette };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const patterns = new Array(GRAIN_FRAMES).fill(0).map(() => ctx.createPattern(makeGrainTile(), "repeat"));
    let width = 0;
    let height = 0;
    let raf;
    let lastGrain = 0;
    let grainIndex = 0;
    let scratches = [];

    function resize() {
      // grain is meant to be coarse, so no DPR scaling
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    resize();
    window.addEventListener("resize", resize);

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - lastGrain < 1000 / GRAIN_FPS) return;
      lastGrain = now;
      grainIndex = (grainIndex + 1 + Math.floor(Math.random() * (GRAIN_FRAMES - 1))) % GRAIN_FRAMES;

      ctx.clearRect(0, 0, width, height);
      const { grain, vignette } = settingsRef.current;

      // grain: blended onto the scene via the canvas's CSS overlay blend mode
      ctx.save();
      ctx.globalAlpha = grain;
      ctx.translate(Math.random() * GRAIN_TILE, Math.random() * GRAIN_TILE);
      ctx.fillStyle = patterns[grainIndex];
      ctx.fillRect(-GRAIN_TILE, -GRAIN_TILE, width + GRAIN_TILE * 2, height + GRAIN_TILE * 2);
      ctx.restore();

      // warm, heavy vignette
      const cx = width / 2;
      const cy = height / 2;
      const vig = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.25, cx, cy, Math.hypot(width, height) * 0.6);
      vig.addColorStop(0, "rgba(40, 22, 8, 0)");
      vig.addColorStop(0.7, `rgba(30, 16, 6, ${Math.min(1, 0.35 * vignette)})`);
      vig.addColorStop(1, `rgba(10, 5, 2, ${Math.min(1, 0.8 * vignette)})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);

      // projector flicker: tiny random brightness dips
      const flicker = Math.random() * 0.03;
      ctx.fillStyle = `rgba(20, 10, 4, ${flicker})`;
      ctx.fillRect(0, 0, width, height);

      // scratches: occasionally spawn, live a few frames, drift sideways
      if (Math.random() < 0.06) {
        scratches.push({ x: Math.random() * width, life: 2 + Math.floor(Math.random() * 6), alpha: 0.15 + Math.random() * 0.25 });
      }
      ctx.lineWidth = 1;
      for (const s of scratches) {
        s.x += (Math.random() - 0.5) * 6;
        s.life--;
        ctx.strokeStyle = `rgba(235, 220, 190, ${s.alpha})`;
        ctx.beginPath();
        ctx.moveTo(s.x, 0);
        ctx.lineTo(s.x + (Math.random() - 0.5) * 8, height);
        ctx.stroke();
      }
      scratches = scratches.filter((s) => s.life > 0);

      // dust specks and hairs
      const specks = Math.random() < 0.5 ? 0 : Math.floor(Math.random() * 3);
      for (let i = 0; i < specks; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.5)" : "rgba(235,220,190,0.35)";
        ctx.beginPath();
        ctx.ellipse(x, y, 0.8 + Math.random() * 2.2, 0.6 + Math.random() * 1.5, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      if (Math.random() < 0.02) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60);
        ctx.stroke();
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block h-full w-full"
      style={{ mixBlendMode: "hard-light" }}
    />
  );
}
