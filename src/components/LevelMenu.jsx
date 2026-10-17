import { useEffect, useRef, useState } from "react";

export const LEVEL_NAMES = { 1: "Low", 2: "Medium", 3: "High", 4: "Ultra High", 5: "Crazy" };

// Top-bar button that opens a dropdown of levels 1-5 (Low to Crazy), used for
// Random on Beat and each scene's audio reaction. `extras` are rows above the
// levels (Off, switching to the scene); the button shows the picked level as
// a small badge.
export default function LevelMenu({ label, icon, lit, level, onPick, extras = [], buttonClass, dropUp = false, alignLeft = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

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

  const choose = (fn) => () => {
    fn();
    setOpen(false);
  };
  const item = (selected) =>
    `flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-[10px] uppercase tracking-wider hover:bg-ember-500/15 ${
      selected ? "text-ember-500 drop-shadow-[0_0_6px_rgba(255,42,6,0.7)]" : "text-ember-200/60 hover:text-ember-100"
    }`;
  const title = level ? `${label}: ${level}. ${LEVEL_NAMES[level]}` : label;

  return (
    <div ref={rootRef} className="relative" data-open={open || undefined}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={title}
        aria-expanded={open}
        title={title}
        className={`relative ${buttonClass(lit || open)}`}
      >
        {icon}
        {level ? (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ember-500 text-[8px] font-bold leading-none text-black">
            {level}
          </span>
        ) : null}
      </button>
      {open && (
        <ul
          className={`absolute ${alignLeft ? "left-0" : "right-0"} ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          } z-10 w-40 overflow-hidden rounded border border-ember-900/60 bg-black/80 py-1 backdrop-blur-sm`}
        >
          <li className="px-3 py-1 text-[9px] uppercase tracking-wider text-ember-300/50">{label}</li>
          {extras.map((x) => (
            <li key={x.label}>
              <button onClick={choose(x.onClick)} className={item(x.selected)}>
                {x.label}
              </button>
            </li>
          ))}
          {Object.entries(LEVEL_NAMES).map(([key, name]) => {
            const l = Number(key);
            return (
              <li key={l}>
                <button onClick={choose(() => onPick(l))} className={item(level === l)}>
                  <span className="tabular-nums">{l}.</span>
                  <span>{name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
