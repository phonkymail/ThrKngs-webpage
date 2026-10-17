export default function Toggle({ label, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
        value
          ? "border-ember-500 bg-ember-500/15 text-ember-500 shadow-[0_0_8px_rgba(255,42,6,0.6)]"
          : "border-ember-900/60 text-ember-400/50"
      }`}
    >
      {label}
    </button>
  );
}
