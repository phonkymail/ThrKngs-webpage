import { useState } from "react";
import { scenes, sceneOrder } from "../scenes";
import GlobalControls from "./GlobalControls";
import { SceneIcon } from "./SceneIcons";

const tabBase = "rounded border px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition-colors";
const tabActive = "border-ember-400 bg-ember-500/20 text-ember-100 shadow-[0_0_8px_rgba(255,42,6,0.6)]";
const tabIdle = "border-ember-900/60 text-ember-400/60 hover:border-ember-500";

export default function ControlPanel({
  sceneKey,
  setSceneKey,
  params,
  setParam,
  applyPreset,
  randomize,
  global,
  setGlobal,
  isFullscreen,
  toggleFullscreen,
  collapsed,
  onHide,
}) {
  // the Global tab is a view, not a scene: showing it leaves the scene running
  const [showGlobal, setShowGlobal] = useState(true);
  const ActiveControls = scenes[sceneKey].Controls;

  return (
    <div
      inert={collapsed}
      className={`pointer-events-auto absolute bottom-0 left-0 right-0 z-50 border-t border-ember-500/30 max-h-[75dvh] overflow-y-auto bg-black/70 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform ${
        collapsed ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="relative flex flex-wrap gap-2 px-4 pb-2 pt-1 sm:px-6">
        <button onClick={() => setShowGlobal(true)} className={`${tabBase} ${showGlobal ? tabActive : tabIdle}`}>
          Global
        </button>
        {sceneOrder.map((key) => {
          return (
            <button
              key={key}
              onClick={() => {
                setSceneKey(key);
                setShowGlobal(false);
              }}
              aria-label={scenes[key].label}
              title={scenes[key].label}
              className={`${tabBase} flex items-center justify-center ${!showGlobal && sceneKey === key ? tabActive : tabIdle}`}
            >
              <SceneIcon sceneKey={key} fallback={scenes[key].label} />
            </button>
          );
        })}
        <button
          onClick={onHide}
          aria-label="Hide controls"
          className="ml-auto flex items-center gap-2 rounded sm:absolute sm:left-1/2 sm:top-1 sm:ml-0 sm:-translate-x-1/2 border border-ember-900/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ember-300/70 transition-colors hover:border-ember-500 hover:text-ember-100"
        >
          Hide controls
          <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-6 px-4 pb-4 pt-1 sm:px-6">
        {showGlobal ? (
          <GlobalControls global={global} setGlobal={setGlobal} isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />
        ) : (
          <ActiveControls params={params} setParam={setParam} applyPreset={applyPreset} randomize={randomize} />
        )}
      </div>
    </div>
  );
}
