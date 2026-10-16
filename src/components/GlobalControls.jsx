import Knob from "./Knob";
import Slider from "./Slider";
import Toggle from "./Toggle";
import ColorField from "./ColorField";
import { palettes } from "../lib/globalParams";
import { SHORTCUTS } from "../lib/shortcuts";

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wider text-ember-300/80">{title}</div>
      {children}
    </div>
  );
}

const Divider = () => <div className="hidden h-16 w-px bg-ember-500/20 sm:block" />;

export default function GlobalControls({ global, setGlobal, isFullscreen, toggleFullscreen }) {
  const set = (key) => (v) => setGlobal(key, v);

  return (
    <>
      <Section title="Colors">
        <div className="flex items-start gap-3">
          <ColorField label="Color A" value={global.colorA} onChange={set("colorA")} />
          <ColorField label="Color B" value={global.colorB} onChange={set("colorB")} />
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(palettes).map(([name, [a, b]]) => (
              <button
                key={name}
                title={name}
                aria-label={`${name} palette`}
                onClick={() => {
                  setGlobal("colorA", a);
                  setGlobal("colorB", b);
                }}
                className="h-4 w-7 rounded-sm border border-ember-900/60 hover:border-ember-400"
                style={{ background: `linear-gradient(90deg, ${a} 50%, ${b} 50%)` }}
              />
            ))}
          </div>
        </div>
        <Toggle label="Random Colors" value={global.randomColors} onChange={set("randomColors")} />
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
          <Slider label="Scene Every" value={global.sceneInterval} min={10} max={180} step={5} onChange={set("sceneInterval")} unit="s" />
        </div>
      </Section>

      <Divider />

      <Section title="Reaction">
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
