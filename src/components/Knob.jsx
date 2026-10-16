import { useCallback, useRef, useState } from "react";

const START_ANGLE = -135;
const END_ANGLE = 135;
const SWEEP = END_ANGLE - START_ANGLE;

function polar(cx, cy, r, angleDeg) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function Knob({ label, value, min, max, step = 0.01, onChange, unit = "", accent = "#ff2a06" }) {
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startY: 0, startValue: 0 });

  const frac = (value - min) / (max - min);
  const angle = START_ANGLE + frac * SWEEP;

  const handlePointerDown = useCallback(
    (e) => {
      setDragging(true);
      dragState.current = { startY: e.clientY, startValue: value };
      e.target.setPointerCapture(e.pointerId);
    },
    [value]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging) return;
      const deltaY = dragState.current.startY - e.clientY;
      const range = max - min;
      const sensitivity = range / 150; // 150px = full range
      let next = dragState.current.startValue + deltaY * sensitivity;
      next = Math.min(max, Math.max(min, next));
      next = Math.round(next / step) * step;
      onChange(next);
    },
    [dragging, max, min, onChange, step]
  );

  const handlePointerUp = useCallback((e) => {
    setDragging(false);
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    onChange((min + max) / 2);
  }, [max, min, onChange]);

  const display = Number.isInteger(step) ? Math.round(value) : value.toFixed(2);

  return (
    <div className="flex select-none flex-col items-center gap-1">
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        className="cursor-ns-resize touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <path
          d={arcPath(28, 28, 22, START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="#33140f"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d={arcPath(28, 28, 22, START_ANGLE, angle)}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
        />
        <circle cx="28" cy="28" r="15" fill="#120604" stroke={dragging ? accent : "#4a1e17"} strokeWidth="1.5" />
        <line
          x1="28"
          y1="28"
          x2={polar(28, 28, 12, angle).x}
          y2={polar(28, 28, 12, angle).y}
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-ember-300/80">{label}</div>
        <div className="text-[10px] text-ember-300/70">
          {display}
          {unit}
        </div>
      </div>
    </div>
  );
}
