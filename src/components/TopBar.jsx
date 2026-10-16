import { scenes, sceneOrder } from "../scenes";
import SeekBar from "./SeekBar";
import { SceneIcon } from "./SceneIcons";

// Where the store icon in the top-left corner links to.
const STORE_URL = "#store";

const idle = "border-white/10 bg-black/20 text-white/50 hover:border-ember-400/60 hover:text-ember-100";
const active = "border-ember-400/60 bg-ember-500/15 text-ember-100";

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
      <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.2" />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" />
      <circle cx="5" cy="4" r="1.3" fill="currentColor" />
      <circle cx="10.5" cy="8" r="1.3" fill="currentColor" />
      <circle cx="7" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 8h14l-1 12H6z" strokeLinejoin="round" />
      <path d="M9 10V6.5a3 3 0 0 1 6 0V10" strokeLinecap="round" />
    </svg>
  );
}

export default function TopBar({ sceneKey, setSceneKey, audio, playPause, autoRandom, setAutoRandom, controlsOpen, toggleControls }) {
  const isPlaying = audio.status === "file" && audio.playing;

  return (
    <div className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap">
      <div className="flex shrink-0 items-center gap-3">
        <h1 className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-ember-100/70">
          <img src="/favicon-32.png" alt="" width="32" height="32" className="h-4 w-4 shrink-0 mix-blend-screen" />
          <span className="drop-shadow-[0_0_8px_rgba(255,60,30,0.6)]">ThrKngs (Full Album)</span>
        </h1>
        <a
          href={STORE_URL}
          aria-label="Store"
          title="Store"
          className="text-ember-100/60 transition-colors hover:text-ember-100"
        >
          <BagIcon />
        </a>
      </div>

      <SeekBar audio={audio} />

      <div className="ml-auto flex shrink-0 items-center gap-2 opacity-60 transition-opacity hover:opacity-100 sm:ml-0">
        <button
          onClick={() => setAutoRandom(!autoRandom)}
          aria-label={autoRandom ? "Turn off random on beat" : "Turn on random on beat"}
          aria-pressed={autoRandom}
          title={autoRandom ? "Random on beat: on" : "Random on beat: off"}
          className={`flex h-8 w-8 items-center justify-center rounded-full border sm:h-[26px] sm:w-[26px] ${autoRandom ? active : idle}`}
        >
          <DiceIcon />
        </button>
        {sceneOrder.map((key) => {
          return (
            <button
              key={key}
              onClick={() => setSceneKey(key)}
              aria-label={scenes[key].label}
              aria-pressed={sceneKey === key}
              title={scenes[key].label}
              className={`flex h-8 w-8 items-center justify-center rounded-full border sm:h-[26px] sm:w-[26px] ${sceneKey === key ? active : idle}`}
            >
              <SceneIcon sceneKey={key} fallback={scenes[key].label} />
            </button>
          );
        })}
        <button
          onClick={playPause}
          aria-label={isPlaying ? "Pause music" : "Play music"}
          title={isPlaying ? "Pause" : "Play"}
          className={`flex h-8 w-8 items-center justify-center rounded-full border sm:h-[26px] sm:w-[26px] ${idle}`}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          onClick={toggleControls}
          aria-label={controlsOpen ? "Hide controls" : "Show controls"}
          title={controlsOpen ? "Hide controls" : "Show controls"}
          className={`flex h-8 w-8 items-center justify-center rounded-full border sm:h-[26px] sm:w-[26px] ${controlsOpen ? active : idle}`}
        >
          <SlidersIcon />
        </button>
      </div>
    </div>
  );
}
