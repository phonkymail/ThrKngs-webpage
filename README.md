# ThrKngs-webpage

The website for **ThrKngs (Full Album)**: an audio-reactive visualizer that plays the full album, plus a store page for the vinyl.

Live at [thrkngs.ongaku.band](https://thrkngs.ongaku.band).

## What's in it

- **Visuals:** two canvas scenes, Neb (nebula/constellations) and Kal (kaleidoscope), that react to the music's loudness, bass, mids and treble. Settings live in the controls panel (`c`).
- **Store:** opens over the visuals at `/#store`, so the music keeps playing.
- **Keyboard:** space play/pause, `f` fullscreen, `c` controls, `r` random on beat, `1`/`2` scenes, `←`/`→` skip 10s, `m` mute.

## Development

Built with [Vite](https://vite.dev), React and Tailwind CSS.

```sh
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # serve the production build locally
npm run lint     # oxlint
```

Cover art and icons are in `public/` and are copied into the build as-is.

## Hosting

- **Site:** a Cloudflare Worker serving `dist/` as static assets (`wrangler.jsonc`), deployed by Cloudflare Workers Builds on every push to `main`.
- **Album mp3:** too large for Worker assets (25 MiB per file), so it lives in the R2 bucket `thrkngs-media` at `https://media.ongaku.band/`. The bucket's CORS policy must allow the site's origin (and `http://localhost:5173` for local dev), or the visualizer can't analyse the audio.
