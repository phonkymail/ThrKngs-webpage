import Knob from "../../components/Knob";
import Slider from "../../components/Slider";
import Toggle from "../../components/Toggle";
import { presets } from "./presets";

export default function KaleidoscopeControls({ params, setParam, applyPreset, randomize }) {
  return (
    <>
      {/* Knobs */}
      <div className="flex flex-wrap gap-4">
        <Knob label="Rotation" value={params.rotationSpeed} min={-1} max={1} onChange={(v) => setParam("rotationSpeed", v)} accent="#ff2a06" />
        <Knob label="Fold" value={params.fold ?? 0} min={-1} max={1} onChange={(v) => setParam("fold", v)} accent="#ff5c3d" />
        <Knob label="Glow" value={params.glow} min={0} max={2.5} onChange={(v) => setParam("glow", v)} accent="#ff9466" />
        <Knob label="Hue Speed" value={params.hueSpeed} min={0} max={1} onChange={(v) => setParam("hueSpeed", v)} accent="#ff6a3d" />
        <Knob label="Wobble" value={params.wobble} min={0} max={1} onChange={(v) => setParam("wobble", v)} accent="#ffb38a" />
        <Knob label="Chaos" value={params.chaos} min={0} max={1} onChange={(v) => setParam("chaos", v)} accent="#d91a00" />
        <Knob label="Wrongness" value={params.wrongness} min={0} max={1} onChange={(v) => setParam("wrongness", v)} accent="#c9a86a" />
        <Knob
          label="Audio React"
          value={params.audioReactivity}
          min={0}
          max={1.5}
          onChange={(v) => setParam("audioReactivity", v)}
          accent="#ff2a06"
        />
      </div>

      <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />

      {/* Layer counts */}
      <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:w-64">
        <Slider label="Segments" value={params.segments} min={2} max={20} step={1} onChange={(v) => setParam("segments", v)} />
        <Slider label="Particles" value={params.particlesPerWedge} min={0} max={14} step={1} onChange={(v) => setParam("particlesPerWedge", v)} />
        <Slider label="Shapes" value={params.shapeCount} min={0} max={8} step={1} onChange={(v) => setParam("shapeCount", v)} />
        <Slider label="Arcs" value={params.arcCount} min={0} max={8} step={1} onChange={(v) => setParam("arcCount", v)} />
        <Slider label="Motifs" value={params.motifCount ?? 4} min={0} max={10} step={1} onChange={(v) => setParam("motifCount", v)} />
        <Slider label="Warp Lines" value={params.streakCount ?? 6} min={0} max={20} step={1} onChange={(v) => setParam("streakCount", v)} />
        <Slider label="Sparkles" value={params.sparkleCount} min={0} max={30} step={1} onChange={(v) => setParam("sparkleCount", v)} />
        <Slider label="Particle Size" value={params.particleSize} min={0.3} max={3} onChange={(v) => setParam("particleSize", v)} />
        <Slider label="Trail Fade" value={params.trailFade} min={0.02} max={0.6} onChange={(v) => setParam("trailFade", v)} />
      </div>

      <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />

      {/* Background */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] uppercase tracking-wider text-ember-300/80">Background</div>
        <div className="grid grid-cols-1 gap-y-2 w-32">
          <Slider label="Intensity" value={params.backgroundIntensity} min={0} max={0.1} onChange={(v) => setParam("backgroundIntensity", v)} />
          <Slider label="Speed" value={params.backgroundSpeed} min={0} max={0.8} onChange={(v) => setParam("backgroundSpeed", v)} />
        </div>
      </div>

      <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />

      {/* Symmetry + Presets */}
      <div className="flex flex-col gap-2">
        <Toggle label="Mirror" value={params.mirror} onChange={(v) => setParam("mirror", v)} />
        <select
          className="rounded border border-ember-900/60 bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wider text-ember-200"
          onChange={(e) => applyPreset(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            Presets
          </option>
          {Object.keys(presets).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          onClick={randomize}
          className="rounded border border-ember-400/70 bg-ember-500/10 px-2 py-1 text-[10px] uppercase tracking-wider text-ember-200 hover:bg-ember-500/20 hover:shadow-[0_0_8px_rgba(255,92,61,0.6)]"
        >
          Randomize
        </button>
      </div>
    </>
  );
}
