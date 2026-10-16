import { useEffect, useRef, useState } from "react";

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// Thin timeline that fills the space it's given in the top bar: faint at
// rest, thicker on hover; click or drag anywhere on it to jump through the mp3.
export default function SeekBar({ audio }) {
  const barRef = useRef(null);
  const [pos, setPos] = useState({ current: 0, duration: 0 });
  const [dragFrac, setDragFrac] = useState(null);
  const { getPosition, seek } = audio;

  // poll the audio element per frame, but only re-render when the shown
  // position moves by a visible amount
  useEffect(() => {
    let raf;
    let lastKey = "";
    function tick() {
      const p = getPosition();
      const key = `${Math.floor(p.current * 4)}:${Math.floor(p.duration)}`;
      if (key !== lastKey) {
        lastKey = key;
        setPos(p);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getPosition]);

  // keep the slot so the top bar layout doesn't jump when a track loads
  if (audio.status !== "file" || pos.duration <= 0) return <div className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1" />;

  function fracAt(e) {
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragFrac(fracAt(e));
  }

  function onPointerMove(e) {
    if (dragFrac !== null) setDragFrac(fracAt(e));
  }

  function onPointerUp(e) {
    if (dragFrac === null) return;
    seek(fracAt(e) * pos.duration);
    setDragFrac(null);
  }

  const frac = dragFrac ?? pos.current / pos.duration;
  const shownTime = dragFrac !== null ? dragFrac * pos.duration : pos.current;

  return (
    <div className="group order-last flex min-w-0 basis-full items-center gap-3 sm:order-none sm:basis-auto sm:flex-1 text-[9px] tabular-nums tracking-wider text-white/30 transition-colors hover:text-ember-100/80">
      <span className="shrink-0">{formatTime(shownTime)}</span>
      <div
        ref={barRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.floor(pos.duration)}
        aria-valuenow={Math.floor(shownTime)}
        aria-valuetext={`${formatTime(shownTime)} of ${formatTime(pos.duration)}`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") seek(pos.current + 10);
          if (e.key === "ArrowLeft") seek(pos.current - 10);
        }}
        className="relative flex h-8 min-w-0 flex-1 cursor-pointer touch-none items-center outline-none sm:h-4"
      >
        <div className="relative h-0.5 w-full bg-white/15 transition-all group-hover:h-[3px] pointer-coarse:h-[3px]">
          <div
            className="absolute inset-y-0 left-0 bg-ember-300/60 group-hover:bg-ember-300"
            style={{ width: `${frac * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-100 opacity-0 shadow-[0_0_6px_rgba(255,120,90,0.9)] transition-opacity group-hover:opacity-100 pointer-coarse:opacity-100"
            style={{ left: `${frac * 100}%` }}
          />
        </div>
      </div>
      <span className="shrink-0">{formatTime(pos.duration)}</span>
    </div>
  );
}
