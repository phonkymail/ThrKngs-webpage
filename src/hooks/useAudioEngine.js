import { useCallback, useRef, useState } from "react";

const FFT_SIZE = 1024;

// Events that count as permission to start sound. On touch screens iOS only
// accepts the finger lifting (touchend / pointerup / click), not pointerdown.
const UNLOCK_EVENTS = ["touchend", "pointerup", "click", "keydown"];

export function useAudioEngine() {
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const dataRef = useRef(new Uint8Array(FFT_SIZE / 2));
  const audioElRef = useRef(null);
  const streamRef = useRef(null);
  const gestureResumeAtRef = useRef(-Infinity);
  const gainRef = useRef(null);
  const volumeRef = useRef(1);

  const [status, setStatus] = useState("idle"); // idle | mic | file
  const [fileName, setFileName] = useState("");
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  // browsers block autoplay until the user interacts with the page
  const [needsGesture, setNeedsGesture] = useState(false);

  const ensureContext = useCallback(() => {
    if (!ctxRef.current) {
      // iOS: play as music, so the ringer's silent switch doesn't mute Web Audio
      try {
        if (navigator.audioSession) navigator.audioSession.type = "playback";
      } catch {
        /* not supported */
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new Ctx();
      const analyser = ctxRef.current.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      // output volume sits after the analyser, so turning the music down
      // doesn't weaken what the visuals react to
      const gain = ctxRef.current.createGain();
      gain.gain.value = 0;
      analyser.connect(gain);
      gain.connect(ctxRef.current.destination);
      gainRef.current = gain;
    }
    return ctxRef.current;
  }, []);

  const disconnectSource = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        /* already disconnected */
      }
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
      audioElRef.current = null;
    }
  }, []);

  const startMic = useCallback(async () => {
    setError("");
    try {
      const ctx = ensureContext();
      await ctx.resume();
      disconnectSource();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      sourceRef.current = source;
      // never play the mic back out of the speakers (feedback)
      gainRef.current.gain.value = 0;
      setStatus("mic");
      setFileName("");
      setPlaying(true);
    } catch {
      setError("Microphone access denied or unavailable.");
    }
  }, [ensureContext, disconnectSource]);

  const playFromUrl = useCallback(
    (url, name, startAt = 0) => {
      setError("");
      const ctx = ensureContext();
      ctx.resume();
      disconnectSource();
      // crossOrigin must be set before src: the album streams from another
      // origin (R2), and without CORS the analyser would only read silence
      const audioEl = new Audio();
      audioEl.crossOrigin = "anonymous";
      // the album plays through once and stops at the end
      audioEl.addEventListener("ended", () => {
        if (audioElRef.current === audioEl) setPlaying(false);
      });
      if (startAt > 0) {
        audioEl.addEventListener("loadedmetadata", () => (audioEl.currentTime = startAt), { once: true });
      }
      audioEl.src = url;
      audioElRef.current = audioEl;
      const source = ctx.createMediaElementSource(audioEl);
      source.connect(analyserRef.current);
      gainRef.current.gain.value = volumeRef.current;
      sourceRef.current = source;
      audioEl
        .play()
        .then(() => setPlaying(true))
        .catch((err) => {
          // a newer track replaced this one before play() settled
          if (audioElRef.current !== audioEl) return;
          if (err?.name !== "NotAllowedError") {
            setError("Could not play track.");
            return;
          }
          setNeedsGesture(true);
          const resume = () => {
            UNLOCK_EVENTS.forEach((type) => window.removeEventListener(type, resume, true));
            setNeedsGesture(false);
            if (audioElRef.current !== audioEl) return;
            gestureResumeAtRef.current = performance.now();
            ctx.resume();
            audioEl
              .play()
              .then(() => setPlaying(true))
              .catch(() => setError("Could not play track."));
          };
          UNLOCK_EVENTS.forEach((type) => window.addEventListener(type, resume, true));
        });
      setStatus("file");
      setFileName(name);
    },
    [ensureContext, disconnectSource]
  );

  const loadFile = useCallback(
    (file) => {
      const url = URL.createObjectURL(file);
      playFromUrl(url, file.name);
    },
    [playFromUrl]
  );

  const loadUrl = useCallback(
    (url, name, startAt) => {
      playFromUrl(url, name ?? decodeURIComponent(url.split("/").pop()), startAt);
    },
    [playFromUrl]
  );

  // reads the element itself rather than `playing` state, so two toggles in
  // quick succession can't act on a stale value
  const togglePlay = useCallback(() => {
    const el = audioElRef.current;
    if (!el) return;
    // the click that just unlocked autoplay shouldn't immediately pause it
    if (performance.now() - gestureResumeAtRef.current < 500) return;
    if (el.paused) {
      // a context created before any tap stays suspended on iOS until resumed
      // inside one, and the music runs through it
      ctxRef.current?.resume();
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    disconnectSource();
    setStatus("idle");
    setFileName("");
    setPlaying(false);
  }, [disconnectSource]);

  // Playback position of the loaded file, in seconds; read per frame by the
  // seek bar rather than kept in state, so it doesn't re-render the whole app
  const getPosition = useCallback(() => {
    const el = audioElRef.current;
    if (!el) return { current: 0, duration: 0 };
    return { current: el.currentTime || 0, duration: Number.isFinite(el.duration) ? el.duration : 0 };
  }, []);

  const setVolume = useCallback((v) => {
    volumeRef.current = v;
    if (gainRef.current && audioElRef.current) gainRef.current.gain.value = v;
  }, []);

  const seek = useCallback((seconds) => {
    const el = audioElRef.current;
    if (el && Number.isFinite(el.duration)) el.currentTime = Math.max(0, Math.min(el.duration, seconds));
  }, []);

  // jump to a point and make sure it's playing (picking a track from the list)
  const playAt = useCallback((seconds) => {
    const el = audioElRef.current;
    if (!el) return;
    el.currentTime = Number.isFinite(el.duration) ? Math.max(0, Math.min(el.duration, seconds)) : Math.max(0, seconds);
    if (el.paused) {
      ctxRef.current?.resume();
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setError("Could not play track."));
    }
  }, []);

  // Returns { bass, mid, treble, overall, spectrum } — spectrum is the raw
  // frequency-bin array (0..255 per bin), reused in place each call.
  const getLevels = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || status === "idle") {
      return { bass: 0, mid: 0, treble: 0, overall: 0, spectrum: null };
    }
    analyser.getByteFrequencyData(dataRef.current);
    const data = dataRef.current;
    const n = data.length;
    const bassEnd = Math.floor(n * 0.12);
    const midEnd = Math.floor(n * 0.5);

    let bass = 0,
      mid = 0,
      treble = 0;
    for (let i = 0; i < bassEnd; i++) bass += data[i];
    for (let i = bassEnd; i < midEnd; i++) mid += data[i];
    for (let i = midEnd; i < n; i++) treble += data[i];

    bass = bass / bassEnd / 255;
    mid = mid / (midEnd - bassEnd) / 255;
    treble = treble / (n - midEnd) / 255;
    const overall = (bass + mid + treble) / 3;

    return { bass, mid, treble, overall, spectrum: data };
  }, [status]);

  return {
    status,
    fileName,
    playing,
    error,
    needsGesture,
    startMic,
    loadFile,
    loadUrl,
    togglePlay,
    stop,
    getLevels,
    getPosition,
    seek,
    playAt,
    setVolume,
  };
}
