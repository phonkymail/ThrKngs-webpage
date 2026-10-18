import Knob from "../../components/Knob";
import Slider from "../../components/Slider";
import Toggle from "../../components/Toggle";
import { presets } from "./presets";

const styles = [
  ["dots", "Dots"],
  ["lines", "Ridge Lines"],
  ["mesh", "Mesh"],
  ["bars", "Bars"],
  ["wave", "Wave"],
  ["ring", "Ring"],
  ["eq", "EQ"],
];

export default function SpectrumControls({ params, setParam, applyPreset, randomize }) {
  return (
    <>
      {/* Knobs */}
      <div className="flex flex-wrap gap-4">
        <Knob label="Height" value={params.height} min={0.2} max={2} onChange={(v) => setParam("height", v)} accent="#ff2a06" />
        <Knob label="Flow" value={params.flowSpeed} min={0} max={1} onChange={(v) => setParam("flowSpeed", v)} accent="#ff5c3d" />
        <Knob label="Orbit" value={params.orbit} min={-1} max={1} onChange={(v) => setParam("orbit", v)} accent="#ff6a3d" />
        <Knob label="Zoom" value={params.zoom ?? 1} min={0.5} max={2.5} onChange={(v) => setParam("zoom", v)} accent="#ff5c3d" />
        <Knob label="Tilt" value={params.tilt} min={0} max={1} onChange={(v) => setParam("tilt", v)} accent="#ff9466" />
        <Knob label="Smooth" value={params.smoothness} min={0} max={1} onChange={(v) => setParam("smoothness", v)} accent="#ffb38a" />
        <Knob label="Glow" value={params.glow} min={0} max={2.5} onChange={(v) => setParam("glow", v)} accent="#ff9466" />
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

      {/* Sliders */}
      <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:w-64">
        <Slider label="Columns" value={params.resolution} min={24} max={120} step={1} onChange={(v) => setParam("resolution", v)} />
        <Slider label="Rows" value={params.depth} min={8} max={60} step={1} onChange={(v) => setParam("depth", v)} />
        <Slider label="Dot Size" value={params.dotSize} min={0.3} max={2.5} onChange={(v) => setParam("dotSize", v)} />
        <Slider label="Reflection" value={params.reflection} min={0} max={1.5} onChange={(v) => setParam("reflection", v)} />
        <Slider label="Backdrop" value={params.backdrop} min={0} max={1} onChange={(v) => setParam("backdrop", v)} />
        <Slider label="Zoom Drift" value={params.zoomDrift ?? 0} min={0} max={1} onChange={(v) => setParam("zoomDrift", v)} />
        <Slider label="Trails" value={params.trails} min={0} max={0.8} onChange={(v) => setParam("trails", v)} />
      </div>

      <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />

      {/* Style + Presets */}
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-ember-300/80">
          Style
          <select
            className="rounded border border-ember-900/60 bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wider text-ember-200"
            value={params.style}
            onChange={(e) => setParam("style", e.target.value)}
          >
            {styles.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
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
