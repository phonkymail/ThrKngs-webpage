// The first entry auto-loads on page start and is what the play button /
// screen click starts when nothing is loaded. The album is too large for
// Worker static assets (25 MiB per file), so it streams from the R2 bucket
// thrkngs-media; that bucket's CORS policy must allow the site's origin.
export const tracks = [
  { name: "ThrKngs (Album)", url: "https://media.ongaku.band/ThrKngs (Album).mp3" },
];
