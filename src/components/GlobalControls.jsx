import Knob from "./Knob";
import Slider from "./Slider";
import Toggle from "./Toggle";
import ColorField from "./ColorField";
import { palettes } from "../lib/globalParams";
import { randomPalette } from "../lib/palette";

const LAYERS = [
  ["colorA", "A"],
  ["colorB", "B"],
  ["colorC", "C"],
  ["colorD", "D"],
];
import { SHORTCUTS } from "../lib/shortcuts";

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wider text-ember-300/80">{title}</div>
      {children}
    </div>
  );
}

// hard-edged stripes, one per color
function swatch(colors) {
  const w = 100 / colors.length;
  return `linear-gradient(90deg, ${colors.map((c, i) => `${c} ${i * w}% ${(i + 1) * w}%`).join(", ")})`;
}

const Divider = () => <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />;

export default function GlobalControls({ global, setGlobal, isFullscreen, toggleFullscreen }) {
  const set = (key) => (v) => setGlobal(key, v);
  const layers = global.colorLayers ?? 2;

  return (
    <>
      <Section title="Colors">
        <div className="flex items-start gap-3">
          {/* layers past the active count are dimmed but still editable */}
          {LAYERS.map(([key, label], i) => (
            <div key={key} className={i < layers ? "" : "opacity-35"}>
              <ColorField label={label} value={global[key]} onChange={set(key)} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ember-300/60">Layers</span>
          {[2, 3, 4].map((n) => (
            <Toggle key={n} label={String(n)} value={layers === n} onChange={() => setGlobal("colorLayers", n)} />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {Object.entries(palettes).map(([name, colors]) => (
            <button
              key={name}
              title={name}
              aria-label={`${name} palette`}
              onClick={() => colors.forEach((c, i) => setGlobal(LAYERS[i][0], c))}
              className="h-4 w-9 rounded-sm border border-ember-900/60 hover:border-ember-400"
              style={{ background: swatch(colors.slice(0, layers)) }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => Object.entries(randomPalette()).forEach(([k, c]) => setGlobal(k, c))}
            className="rounded border border-ember-400/70 bg-ember-500/10 px-2 py-1 text-[10px] uppercase tracking-wider text-ember-200 hover:bg-ember-500/20 hover:shadow-[0_0_8px_rgba(255,92,61,0.6)]"
          >
            Random Palette
          </button>
          <Toggle label="Random Colors" value={global.randomColors} onChange={set("randomColors")} />
        </div>
      </Section>

      <Divider />

      <Section title="Color FX">
        <div className="grid w-64 grid-cols-2 gap-x-6 gap-y-2">
          <Slider label="Hue" value={global.hueShift} min={-180} max={180} step={1} onChange={set("hueShift")} unit="°" />
          <Slider label="Saturation" value={global.saturation} min={0} max={2} onChange={set("saturation")} />
          <Slider label="Neon" value={global.neon} min={0} max={1} onChange={set("neon")} />
          <Slider label="Cycle" value={global.colorCycle} min={0} max={1} onChange={set("colorCycle")} />
          <Slider label="Hue Drift" value={global.hueDrift} min={0} max={1} onChange={set("hueDrift")} />
        </div>
        <div className="flex gap-2">
          <Toggle label="Beat Color" value={global.beatColor} onChange={set("beatColor")} />
          <button
            onClick={() => {
              setGlobal("hueShift", 0);
              setGlobal("saturation", 1);
              setGlobal("neon", 0);
              setGlobal("colorCycle", 0);
              setGlobal("hueDrift", 0);
              setGlobal("beatColor", false);
            }}
            className="rounded border border-ember-900/60 px-2 py-1 text-[10px] uppercase tracking-wider text-ember-400/70 hover:border-ember-400"
          >
            Reset FX
          </button>
        </div>
      </Section>

      <Divider />

      <Section title="Auto">
        <div className="flex gap-2">
          <Toggle label="Auto (Beat)" value={global.autoRandomize} onChange={set("autoRandomize")} />
          <Toggle label="Auto Scene" value={global.autoScene} onChange={set("autoScene")} />
        </div>
        <div className="grid w-64 grid-cols-2 gap-x-6 gap-y-2">
          <Slider label="Sensitivity" value={global.beatSensitivity} min={1.1} max={3} onChange={set("beatSensitivity")} />
          <Slider label="Min Gap" value={global.beatGap} min={1} max={20} step={0.5} onChange={set("beatGap")} unit="s" />
          <Slider label="Modulation" value={global.modulation} min={0} max={1} onChange={set("modulation")} />
          <Slider label="Scene Every" value={global.sceneInterval} min={10} max={180} step={5} onChange={set("sceneInterval")} unit="s" />
        </div>
      </Section>

      <Divider />

      <Section title="Reaction">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ember-300/60">React to</span>
          <Toggle label="Drums" value={global.reactBand === "drums"} onChange={() => setGlobal("reactBand", "drums")} />
          <Toggle label="Highs" value={global.reactBand === "highs"} onChange={() => setGlobal("reactBand", "highs")} />
          <Toggle label="Full" value={global.reactBand === "full"} onChange={() => setGlobal("reactBand", "full")} />
        </div>
        <div className="flex gap-4">
          <Knob label="React" value={global.masterReact} min={0} max={2} onChange={set("masterReact")} accent="#ff2a06" />
          <Knob label="Speed" value={global.masterSpeed} min={0} max={2} onChange={set("masterSpeed")} accent="#ff6a3d" />
          <Knob label="Hit FX" value={global.hitFx} min={0} max={2} onChange={set("hitFx")} accent="#ff9466" />
        </div>
      </Section>

      <Divider />

      <Section title="Look">
        <div className="grid w-64 grid-cols-2 gap-x-6 gap-y-2">
          <Slider label="Exposure" value={global.exposure} min={0.3} max={1.2} onChange={set("exposure")} />
          <Slider label="Sepia" value={global.sepia} min={0} max={1} onChange={set("sepia")} />
          <Slider label="Grain" value={global.grain} min={0} max={0.3} onChange={set("grain")} />
          <Slider label="Vignette" value={global.vignette} min={0} max={1.5} onChange={set("vignette")} />
        </div>
      </Section>

      <Divider />

      <Section title="Output">
        <div className="w-32">
          <Slider label="Volume" value={global.volume} min={0} max={1} onChange={set("volume")} />
        </div>
        <div className="flex gap-2">
          {/* iPhone Safari has no fullscreen API for pages */}
          {document.fullscreenEnabled && (
            <Toggle label={isFullscreen ? "Exit Full" : "Fullscreen"} value={isFullscreen} onChange={toggleFullscreen} />
          )}
          <Toggle label="Auto-hide UI" value={global.autoHideUi} onChange={set("autoHideUi")} />
        </div>
        <div className="max-w-48 text-[9px] leading-relaxed tracking-wider text-ember-300/50 pointer-coarse:hidden">
          {SHORTCUTS.map(([keys, action]) => `${keys} ${action}`).join(" · ")}
        </div>
      </Section>
    </>
  );
}
