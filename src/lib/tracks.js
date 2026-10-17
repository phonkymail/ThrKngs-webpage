// The first entry auto-loads on page start and is what the play button /
// screen click starts when nothing is loaded. The album is too large for
// Worker static assets (25 MiB per file), so it streams from the R2 bucket
// thrkngs-media; that bucket's CORS policy must allow the site's origin.
export const tracks = [
  { name: "ThrKngs (Album)", url: "https://media.ongaku.band/ThrKngs (Album).mp3" },
];

// Where each song starts inside the album mp3, in seconds
export const tracklist = [
  { title: "All Hail", start: 0 },
  { title: "Three Kings", start: 3 * 60 + 7 },
  { title: "Eminar", start: 7 * 60 + 7 },
  { title: "Lost", start: 12 * 60 + 12 },
  { title: "War", start: 15 * 60 + 43 },
  { title: "New Sails", start: 19 * 60 + 52 },
  { title: "Battle to Fail", start: 23 * 60 + 47 },
  { title: "Battle to Fail Coda", start: 27 * 60 + 52 },
  { title: "Be Around", start: 30 * 60 },
  { title: "O.D. To Self", start: 32 * 60 + 53 },
  { title: "The Confession", start: 34 * 60 + 14 },
];
