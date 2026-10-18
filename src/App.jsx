import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Visualizer from "./components/Visualizer";
import ControlPanel from "./components/ControlPanel";
import TopBar from "./components/TopBar";
import Patina from "./components/Patina";
import StorePage from "./store/StorePage";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { useBeatRandomizer } from "./hooks/useBeatRandomizer";
import { scenes, sceneOrder } from "./scenes";
import { tracks } from "./lib/tracks";
import { createDynamics } from "./lib/audioDynamics";
import { defaultGlobal, sceneFilter, beatLevels, reactLevels } from "./lib/globalParams";
import { extendColors, randomPalette } from "./lib/palette";
import { SHORTCUTS } from "./lib/shortcuts";

const IDLE_HIDE_MS = 3000;
const GUIDE_MS = 7000;
const SEEK_STEP_S = 10;

// colors live in the global settings, so scene presets/randomizers hand
// theirs over instead of keeping them per scene (C and D follow A and B)
function splitColors({ colorA, colorB, ...rest }) {
  return [rest, colorA && colorB ? extendColors({ colorA, colorB }) : null];
}

export default function App() {
  const [sceneKey, setSceneKey] = useState(sceneOrder[0]);
  const [paramsByScene, setParamsByScene] = useState(() => {
    const init = {};
    for (const key of sceneOrder) init[key] = splitColors(scenes[key].defaultParams)[0];
    return init;
  });
  const [global, setGlobalState] = useState(defaultGlobal);
  // the Audio React level (1-5) picked per scene from its top-bar button;
  // it holds through randomizes until a preset or the knob changes it
  const [reactLevelByScene, setReactLevelByScene] = useState({});
  const [collapsed, setCollapsed] = useState(true);
  const audio = useAudioEngine();

  const setGlobal = useCallback((key, value) => setGlobalState((g) => ({ ...g, [key]: value })), []);
  // Random on Beat dropdown: 0 turns it off, 1-5 turns it on at that level
  const setBeatLevel = useCallback(
    (level) =>
      setGlobalState((g) =>
        level ? { ...g, ...beatLevels[level], beatLevel: level, autoRandomize: true } : { ...g, autoRandomize: false }
      ),
    []
  );

  // one shared, per-frame audio analysis for the visuals and the beat trigger
  const [processDynamics] = useState(createDynamics);
  const { getLevels } = audio;
  const reactBandRef = useRef(defaultGlobal.reactBand);
  useEffect(() => {
    reactBandRef.current = global.reactBand;
  }, [global.reactBand]);
  const getFrame = useCallback(
    (now) => processDynamics(getLevels, now, reactBandRef.current),
    [processDynamics, getLevels]
  );

  // scene params as the controls see them: merged over defaults so a param
  // added later (or missing from a preset) never arrives undefined
  const params = useMemo(
    () => ({ ...scenes[sceneKey].defaultParams, ...paramsByScene[sceneKey] }),
    [sceneKey, paramsByScene]
  );

  // what the engine draws with: scene params plus the global layer on top
  // (colors are added per frame by the Visualizer, from the Color FX)
  const renderParams = useMemo(
    () => ({
      ...params,
      audioReactivity: params.audioReactivity * global.masterReact,
      hitFx: global.hitFx,
    }),
    [params, global.masterReact, global.hitFx]
  );

  // auto-load the first track on page load (guarded against StrictMode's double effect)
  const autoLoadedRef = useRef(false);
  const { loadUrl, setVolume } = audio;
  useEffect(() => {
    if (autoLoadedRef.current || tracks.length === 0) return;
    autoLoadedRef.current = true;
    loadUrl(encodeURI(tracks[0].url), tracks[0].name);
  }, [loadUrl]);

  useEffect(() => setVolume(global.volume), [setVolume, global.volume, audio.status]);

  const setParam = useCallback(
    (key, value) => {
      setParamsByScene((prev) => ({ ...prev, [sceneKey]: { ...prev[sceneKey], [key]: value } }));
      if (key === "audioReactivity") setReactLevelByScene((r) => ({ ...r, [sceneKey]: undefined }));
    },
    [sceneKey]
  );

  // a scene button's dropdown: switch to that scene at the picked Audio React level
  const setReactLevel = useCallback((key, level) => {
    setSceneKey(key);
    setReactLevelByScene((r) => ({ ...r, [key]: level }));
    setParamsByScene((prev) => ({ ...prev, [key]: { ...prev[key], audioReactivity: reactLevels[level] } }));
  }, []);

  const applyPreset = useCallback(
    (name) => {
      const preset = scenes[sceneKey].presets[name];
      if (!preset) return;
      const [rest, colors] = splitColors(preset);
      setParamsByScene((prev) => ({ ...prev, [sceneKey]: rest }));
      setReactLevelByScene((r) => ({ ...r, [sceneKey]: undefined }));
      if (colors) setGlobalState((g) => ({ ...g, ...colors }));
    },
    [sceneKey]
  );

  const randomColors = global.randomColors;
  const randomize = useCallback(() => {
    const [rest, colors] = splitColors(scenes[sceneKey].randomizeParams());
    const level = reactLevelByScene[sceneKey];
    if (level !== undefined) rest.audioReactivity = reactLevels[level];
    for (const key of scenes[sceneKey].speedKeys ?? []) delete rest[key];
    setParamsByScene((prev) => ({ ...prev, [sceneKey]: { ...prev[sceneKey], ...rest } }));
    if (randomColors && colors) setGlobalState((g) => ({ ...g, ...randomPalette() }));
  }, [sceneKey, randomColors, reactLevelByScene]);

  const { status, togglePlay } = audio;
  const playPause = useCallback(() => {
    if (status === "file") togglePlay();
    else if (tracks.length > 0) loadUrl(encodeURI(tracks[0].url), tracks[0].name);
  }, [status, togglePlay, loadUrl]);

  // picking a song from the tracklist: jump there, loading the album first
  // if nothing is loaded yet
  const { playAt } = audio;
  const playTrack = useCallback(
    (start) => {
      if (status === "file") playAt(start);
      else if (tracks.length > 0) loadUrl(encodeURI(tracks[0].url), tracks[0].name, start);
    },
    [status, playAt, loadUrl]
  );

  // a beat either switches scene (when Auto Scene is due) or randomizes
  const lastSceneSwitchRef = useRef(null);
  const { autoScene, sceneInterval, autoRandomize } = global;
  const onBeat = useCallback(() => {
    const now = performance.now();
    lastSceneSwitchRef.current ??= now;
    if (autoScene && now - lastSceneSwitchRef.current > sceneInterval * 1000) {
      lastSceneSwitchRef.current = now;
      setSceneKey((k) => sceneOrder[(sceneOrder.indexOf(k) + 1) % sceneOrder.length]);
    } else if (autoRandomize) {
      randomize();
    }
  }, [autoScene, sceneInterval, autoRandomize, randomize]);

  useBeatRandomizer({
    enabled: autoRandomize || autoScene,
    getFrame,
    sensitivity: global.beatSensitivity,
    cooldownMs: global.beatGap * 1000,
    onTrigger: onBeat,
  });

  // fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }, []);

  // mute remembers the volume it replaced
  const unmuteVolumeRef = useRef(defaultGlobal.volume);
  const toggleMute = useCallback(() => {
    setGlobalState((g) => {
      if (g.volume > 0) {
        unmuteVolumeRef.current = g.volume;
        return { ...g, volume: 0 };
      }
      return { ...g, volume: unmuteVolumeRef.current || defaultGlobal.volume };
    });
  }, []);

  // the store opens as a layer over the visuals (so the music keeps playing),
  // addressed as #store so links and the back button work
  const [storeOpen, setStoreOpen] = useState(() => window.location.hash === "#store");
  const openedInAppRef = useRef(false);
  const storeScrollRef = useRef(null);
  useEffect(() => {
    function onHash() {
      const open = window.location.hash === "#store";
      if (open) openedInAppRef.current = true;
      setStoreOpen(open);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (storeOpen && storeScrollRef.current) storeScrollRef.current.scrollTop = 0;
  }, [storeOpen]);
  const closeStore = useCallback(() => {
    if (openedInAppRef.current) {
      // undo our own #store entry, so back/forward stay in step
      window.history.back();
    } else {
      // landed directly on /#store: drop the hash without leaving the page
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setStoreOpen(false);
    }
  }, []);

  // keyboard shortcuts (see SHORTCUTS)
  const { seek, getPosition } = audio;
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const key = e.key.toLowerCase();
      // in the store only the music keys apply
      if (storeOpen && !(e.code === "Space" || key === "m" || key === "escape")) return;
      if (key === "escape" && storeOpen) {
        closeStore();
      } else if (e.code === "Space") {
        // a focused button would also "click" on space and toggle twice
        if (tag === "BUTTON") e.target.blur();
        e.preventDefault();
        playPause();
      } else if (key === "f") {
        toggleFullscreen();
      } else if (key === "c") {
        setCollapsed((c) => !c);
      } else if (key === "r") {
        setGlobalState((g) => ({ ...g, autoRandomize: !g.autoRandomize }));
      } else if (key === "m") {
        toggleMute();
      } else if (/^[1-9]$/.test(key) && sceneOrder[Number(key) - 1]) {
        setSceneKey(sceneOrder[Number(key) - 1]);
      } else if ((key === "arrowleft" || key === "arrowright") && e.target.getAttribute("role") !== "slider") {
        // the focused seek bar handles its own arrows
        e.preventDefault();
        seek(getPosition().current + (key === "arrowright" ? SEEK_STEP_S : -SEEK_STEP_S));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playPause, toggleFullscreen, toggleMute, seek, getPosition, storeOpen, closeStore]);

  // quick guide: up while waiting for the first tap, else briefly after load
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), GUIDE_MS);
    return () => clearTimeout(t);
  }, []);
  const showGuide = audio.needsGesture || !introDone;

  // auto-hide the top bar and cursor after a few seconds without movement
  const [idle, setIdle] = useState(false);
  const hideUiRef = useRef(false);
  const revealTapRef = useRef(false);
  useEffect(() => {
    let timer;
    function onPointerDown() {
      revealTapRef.current = hideUiRef.current;
      wake();
    }
    function wake() {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), IDLE_HIDE_MS);
    }
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", wake);
    };
  }, []);
  const hideUi = global.autoHideUi && idle && collapsed && !audio.needsGesture;
  useEffect(() => {
    hideUiRef.current = hideUi;
  }, [hideUi]);

  const onScreenClick = useCallback(() => {
    if (revealTapRef.current) {
      revealTapRef.current = false;
      return;
    }
    playPause();
  }, [playPause]);

  return (
    <div className={`relative h-dvh w-full overflow-hidden bg-black ${hideUi ? "cursor-none" : ""}`}>
      <Visualizer
        sceneKey={sceneKey}
        params={renderParams}
        colorFx={global}
        getFrame={getFrame}
        onClick={onScreenClick}
        speed={global.masterSpeed}
        paused={storeOpen}
        modulation={global.autoRandomize ? global.modulation : 0}
        filter={sceneFilter(global)}
      />
      <Patina grain={global.grain} vignette={global.vignette} />

      <div className={`transition-opacity duration-700 ${hideUi ? "pointer-events-none opacity-0" : "opacity-100"}`}>
        <TopBar
          sceneKey={sceneKey}
          setSceneKey={setSceneKey}
          audio={audio}
          playPause={playPause}
          playTrack={playTrack}
          beatOn={global.autoRandomize}
          beatLevel={global.beatLevel ?? 3}
          setBeatLevel={setBeatLevel}
          reactLevels={reactLevelByScene}
          setReactLevel={setReactLevel}
          controlsOpen={!collapsed}
          toggleControls={() => setCollapsed((c) => !c)}
        />
      </div>

      <div
        className={`pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 px-4 text-center transition-opacity duration-1000 ${
          showGuide && collapsed ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!showGuide}
      >
        <p className="animate-pulse text-[11px] uppercase tracking-[0.4em] text-ember-100/80 drop-shadow-[0_0_10px_rgba(255,60,30,0.8)]">
          press anywhere to start and pause
        </p>
        <ul className="flex max-w-xl flex-wrap justify-center gap-x-4 gap-y-1 text-[9px] uppercase tracking-[0.25em] text-ember-100/50 pointer-coarse:hidden">
          {SHORTCUTS.map(([keys, action]) => (
            <li key={keys}>
              <span className="text-ember-100/80">{keys}</span> {action}
            </li>
          ))}
        </ul>
      </div>

      {storeOpen && (
        <div ref={storeScrollRef} className="fixed inset-0 z-[70] overflow-y-auto overflow-x-hidden bg-black">
          <StorePage onBack={closeStore} isPlaying={audio.status === "file" && audio.playing} playPause={playPause} />
        </div>
      )}

      <ControlPanel
        sceneKey={sceneKey}
        setSceneKey={setSceneKey}
        params={params}
        setParam={setParam}
        applyPreset={applyPreset}
        randomize={randomize}
        global={global}
        setGlobal={setGlobal}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        collapsed={collapsed}
        onHide={() => setCollapsed(true)}
      />
    </div>
  );
}
