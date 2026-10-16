// Icons standing in for the scene names (top bar and controls-panel tabs).

// Neb: a little constellation of linked stars
function NebulaIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <path d="M3 11.5L6.5 5 10 8.5l3-5M6.5 5l-1 8.5 4.5-5" strokeOpacity="0.7" />
      <circle cx="3" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="3.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Kal: six mirrored petals around a center, like a kaleidoscope
function KaleidoscopeIcon() {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      {petals.map((deg) => (
        <path key={deg} d="M8 8C6.9 6.6 6.9 4 8 2c1.1 2 1.1 4.6 0 6z" transform={`rotate(${deg} 8 8)`} />
      ))}
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const icons = { nebula: NebulaIcon, kaleidoscope: KaleidoscopeIcon };

// the scene's icon, or its text label for a scene without one
export function SceneIcon({ sceneKey, fallback }) {
  const Icon = icons[sceneKey];
  return Icon ? <Icon /> : fallback;
}
