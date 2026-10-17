import { scenes, sceneOrder } from "../scenes";
import SeekBar from "./SeekBar";
import TrackList from "./TrackList";
import { SceneIcon } from "./SceneIcons";

// Where the store icon in the top-left corner links to.
const STORE_URL = "#store";

// idle buttons sit dimmed until the bar is hovered; active ones always show
// in the logo red with a soft glow
const idle =
  "border-white/10 bg-black/20 text-white/50 opacity-60 transition-opacity group-hover:opacity-100 hover:border-ember-400/60 hover:text-ember-100";
const active = "border-ember-500 bg-ember-500/15 text-ember-500 shadow-[0_0_8px_rgba(255,42,6,0.6)]";

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

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// phone dock: larger tap targets, no hover dimming (touch has no hover)
const dockIdle = "border-white/15 bg-black/40 text-white/70 active:border-ember-400/60";
const dockBtn = "flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm";

export default function TopBar({ sceneKey, setSceneKey, audio, playPause, playTrack, autoRandom, setAutoRandom, controlsOpen, toggleControls }) {
  const isPlaying = audio.status === "file" && audio.playing;

  const diceProps = {
    onClick: () => setAutoRandom(!autoRandom),
    "aria-label": autoRandom ? "Turn off random on beat" : "Turn on random on beat",
    "aria-pressed": autoRandom,
    title: autoRandom ? "Random on beat: on" : "Random on beat: off",
  };
  const sceneProps = (key) => ({
    onClick: () => setSceneKey(key),
    "aria-label": scenes[key].label,
    "aria-pressed": sceneKey === key,
    title: scenes[key].label,
  });
  const playProps = {
    onClick: playPause,
    "aria-label": isPlaying ? "Pause music" : "Play music",
    title: isPlaying ? "Pause" : "Play",
  };
  const controlsProps = {
    onClick: toggleControls,
    "aria-label": controlsOpen ? "Hide controls" : "Show controls",
    title: controlsOpen ? "Hide controls" : "Show controls",
  };
  // phone: the open control panel takes the screen, so the bar and dock step aside
  const phoneHidden = controlsOpen ? "max-sm:pointer-events-none max-sm:opacity-0" : "";
  const small = "flex h-8 w-8 items-center justify-center rounded-full border sm:h-[26px] sm:w-[26px]";

  return (
    <>
      <div className={`absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 flex items-center gap-x-4 transition-opacity duration-300 ${phoneHidden}`}>
        <div className="flex shrink-0 items-center gap-3">
          <h1 className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-ember-100/70">
            <img src="/favicon-32.png" alt="" width="32" height="32" className="h-4 w-4 shrink-0 mix-blend-screen" />
            <span className="drop-shadow-[0_0_8px_rgba(255,60,30,0.6)]">ThrKngs - Visualizer</span>
          </h1>
        </div>

        {/* desktop / tablet: seek bar and buttons share the top row */}
        <div className="hidden min-w-0 flex-1 sm:flex">
          <SeekBar audio={audio} />
        </div>
        <div className="group hidden shrink-0 items-center gap-2 sm:flex">
          <button {...diceProps} className={`${small} ${autoRandom ? active : idle}`}>
            <DiceIcon />
          </button>
          {sceneOrder.map((key) => (
            <button key={key} {...sceneProps(key)} className={`${small} ${sceneKey === key ? active : idle}`}>
              <SceneIcon sceneKey={key} fallback={scenes[key].label} />
            </button>
          ))}
          <TrackList audio={audio} playTrack={playTrack} buttonClass={(open) => `${small} ${open ? active : idle}`} />
          <button {...playProps} className={`${small} ${idle}`}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button {...controlsProps} className={`${small} ${controlsOpen ? active : idle}`}>
            <SlidersIcon />
          </button>
        </div>
        <a
          href={STORE_URL}
          aria-label="Info"
          title="Info"
          className="ml-auto shrink-0 text-[color-mix(in_srgb,var(--color-ember-500)_40%,var(--color-ember-100))]/70 drop-shadow-[0_0_4px_rgba(255,42,6,0.25)] transition-colors hover:text-ember-100"
        >
          <InfoIcon />
        </a>
      </div>

      {/* phone: a player dock at the bottom, in thumb reach */}
      <div className={`absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col gap-2 transition-opacity duration-300 sm:hidden ${phoneHidden}`}>
        <div className="flex">
          <SeekBar audio={audio} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-2">
            <button {...diceProps} className={`${dockBtn} ${autoRandom ? active : dockIdle}`}>
              <DiceIcon />
            </button>
            {sceneOrder.map((key) => (
              <button key={key} {...sceneProps(key)} className={`${dockBtn} ${sceneKey === key ? active : dockIdle}`}>
                <SceneIcon sceneKey={key} fallback={scenes[key].label} />
              </button>
            ))}
          </div>
          <button
            {...playProps}
            className={`mx-3 flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-sm ${
              isPlaying ? dockIdle : active
            } [&_svg]:h-4 [&_svg]:w-4`}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <div className="flex items-center justify-end gap-2">
            <TrackList audio={audio} playTrack={playTrack} dropUp buttonClass={(open) => `${dockBtn} ${open ? active : dockIdle}`} />
            <button {...controlsProps} className={`${dockBtn} ${controlsOpen ? active : dockIdle}`}>
              <SlidersIcon />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
