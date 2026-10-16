export default function Toggle({ label, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
        value
          ? "border-ember-400 bg-ember-500/20 text-ember-200 shadow-[0_0_8px_rgba(255,92,61,0.6)]"
          : "border-ember-900/60 text-ember-400/50"
      }`}
    >
      {label}
    </button>
  );
}
