export default function Slider({ label, value, min, max, step = 0.01, onChange, unit = "", accent = "#ff6a3d" }) {
  const display = Number.isInteger(step) ? Math.round(value) : value.toFixed(2);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
        <span className="text-ember-300/80">{label}</span>
        <span className="text-ember-300/70">
          {display}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ember-900/60 accent-ember-400"
        style={{ accentColor: accent }}
      />
    </div>
  );
}
