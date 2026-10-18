import Knob from "../../components/Knob";
import Slider from "../../components/Slider";
import { presets } from "./presets";

const SPIN_MODES = [
  ["auto", "Auto"],
  ["cw", "CW"],
  ["ccw", "CCW"],
];

// a tiny Auto / CW / CCW segmented switch
function SpinMode({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wider text-ember-300/80">{label}</div>
      <div className="flex overflow-hidden rounded border border-ember-900/60">
        {SPIN_MODES.map(([mode, text]) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`px-2 py-1 text-[10px] uppercase tracking-wider ${
              (value ?? "auto") === mode ? "bg-ember-500/15 text-ember-500 shadow-[inset_0_0_8px_rgba(255,42,6,0.5)] drop-shadow-[0_0_4px_rgba(255,42,6,0.6)]" : "bg-black/60 text-ember-300/70 hover:bg-ember-500/10"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NebulaControls({ params, setParam, applyPreset, randomize }) {
  return (
    <>
      {/* Knobs */}
      <div className="flex flex-wrap gap-4">
        <Knob label="Float Speed" value={params.floatSpeed} min={0} max={1} onChange={(v) => setParam("floatSpeed", v)} accent="#ff2a06" />
        <Knob label="Twinkle" value={params.twinkle} min={0} max={1.5} onChange={(v) => setParam("twinkle", v)} accent="#ff6a3d" />
        <Knob label="Glow" value={params.glow} min={0} max={2.5} onChange={(v) => setParam("glow", v)} accent="#ff9466" />
        <Knob label="Swirl" value={params.swirl} min={0} max={2} onChange={(v) => setParam("swirl", v)} accent="#ff9466" />
        <Knob label="Fold" value={params.fold ?? 0} min={-1} max={1} onChange={(v) => setParam("fold", v)} accent="#ff5c3d" />
        <Knob label="Shockwave" value={params.shockwave} min={0} max={2} onChange={(v) => setParam("shockwave", v)} accent="#d91a00" />
        <Knob label="Streaks" value={params.streaks} min={0} max={1.5} onChange={(v) => setParam("streaks", v)} accent="#ffb38a" />
        <Knob label="Link Dist" value={params.linkDistance} min={40} max={300} step={1} onChange={(v) => setParam("linkDistance", v)} accent="#ffb38a" />
      </div>

      <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />

      {/* Sliders */}
      <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:w-64">
        <Slider label="Dust Count" value={params.dustCount} min={0} max={600} step={10} onChange={(v) => setParam("dustCount", v)} />
        <Slider label="Node Count" value={params.nodeCount} min={0} max={120} step={1} onChange={(v) => setParam("nodeCount", v)} />
        <Slider label="Link Opacity" value={params.linkOpacity} min={0} max={1} onChange={(v) => setParam("linkOpacity", v)} />
        <Slider
          label="Audio React"
          value={params.audioReactivity}
          min={0}
          max={1.5}
          onChange={(v) => setParam("audioReactivity", v)}
          accent="#ff2a06"
        />
      </div>

      <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />

      {/* Spin: master direction + the independent second layer */}
      <div className="flex flex-col gap-2">
        <SpinMode label="Spin" value={params.spinMode} onChange={(v) => setParam("spinMode", v)} />
        <SpinMode label="Layer 2 Spin" value={params.layer2Mode} onChange={(v) => setParam("layer2Mode", v)} />
        <div className="grid grid-cols-1 gap-y-2 w-32">
          <Slider label="L2 Stars" value={params.layer2Count ?? 0} min={0} max={500} step={10} onChange={(v) => setParam("layer2Count", v)} />
          <Slider label="L2 Speed" value={params.layer2Speed ?? 0.5} min={0} max={1} onChange={(v) => setParam("layer2Speed", v)} />
          <Slider label="L2 Opacity" value={params.layer2Opacity ?? 0.6} min={0} max={1} onChange={(v) => setParam("layer2Opacity", v)} />
        </div>
      </div>

      <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />

      {/* Spectralizer */}
      <div className="flex flex-col gap-2">
        <select
          className="rounded border border-ember-900/60 bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wider text-ember-200"
          value={params.spectralizerStyle}
          onChange={(e) => setParam("spectralizerStyle", e.target.value)}
        >
          <option value="off">Off</option>
          <option value="radial-bars">Radial Bars</option>
          <option value="radial-dots">Radial Dots</option>
        </select>
        <div className="grid grid-cols-1 gap-y-2 w-32">
          <Slider label="Bars" value={params.spectralizerBars} min={12} max={120} step={1} onChange={(v) => setParam("spectralizerBars", v)} />
          <Slider label="Size" value={params.spectralizerSize} min={0.01} max={0.35} onChange={(v) => setParam("spectralizerSize", v)} />
          <Slider
            label="Sensitivity"
            value={params.spectralizerSensitivity}
            min={0.2}
            max={3}
            onChange={(v) => setParam("spectralizerSensitivity", v)}
          />
          <Slider
            label="Opacity"
            value={params.spectralizerOpacity}
            min={0.05}
            max={1}
            onChange={(v) => setParam("spectralizerOpacity", v)}
          />
        </div>
      </div>

      <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />

      {/* Presets + Randomize */}
      <div className="flex flex-col gap-2">
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
