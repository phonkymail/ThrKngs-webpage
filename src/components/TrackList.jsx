import { useEffect, useRef, useState } from "react";
import { tracklist } from "../lib/tracks";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

// index of the song playing at `seconds` in the album mp3
function trackAt(seconds) {
  let idx = 0;
  for (let i = 0; i < tracklist.length; i++) if (seconds >= tracklist[i].start) idx = i;
  return idx;
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8" />
      <circle cx="2.5" cy="4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Tracklist button for the top bar: opens a dropdown of the album's songs,
// marks the one playing, and jumps to a song's spot in the mp3 when picked.
export default function TrackList({ audio, playTrack, buttonClass, dropUp = false }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(-1);
  const rootRef = useRef(null);
  const { getPosition } = audio;
  const loaded = audio.status === "file";

  // follow the playhead only while the list is open
  useEffect(() => {
    if (!open) return;
    let raf;
    function tick() {
      setCurrent(loaded ? trackAt(getPosition().current) : -1);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, loaded, getPosition]);

  // close on a click outside or Escape
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative" data-open={open || undefined}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Tracklist"
        aria-expanded={open}
        title="Tracklist"
        className={buttonClass(open)}
      >
        <ListIcon />
      </button>
      {open && (
        <ol className={`absolute right-0 ${dropUp ? "bottom-full mb-2" : "top-full mt-2"} w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded border border-ember-900/60 bg-black/80 py-1 backdrop-blur-sm`}>
          {tracklist.map((t, i) => (
            <li key={t.title}>
              <button
                onClick={() => playTrack(t.start)}
                className={`flex w-full items-baseline gap-3 px-3 py-1.5 text-left text-[10px] uppercase tracking-wider hover:bg-ember-500/15 ${
                  i === current
                    ? "text-ember-500 drop-shadow-[0_0_6px_rgba(255,42,6,0.7)]"
                    : "text-ember-200/60 hover:text-ember-100"
                }`}
              >
                <span className="w-4 shrink-0 tabular-nums text-ember-300/50">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="shrink-0 tabular-nums text-white/30">{formatTime(t.start)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
