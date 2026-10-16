export default function ColorField({ label, value, onChange }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded border border-ember-900/60 bg-transparent p-0"
      />
      <span className="text-[10px] uppercase tracking-wider text-ember-300/80">{label}</span>
    </div>
  );
}
