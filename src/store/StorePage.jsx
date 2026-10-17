import Patina from "../components/Patina";
import BrandIcon from "./BrandIcon";

const CONTACT_EMAIL = "contact@thrkngs.ongaku.band";

const VINYL = {
  title: "ThrKngs (Full Album)",
  format: "Vinyl LP",
  specs: ["12\u2033 vinyl LP, 33\u2153 RPM", "Black vinyl", "11 compositions", "Total length 37:09"],
};

const STREAMING = [
  { name: "Spotify", icon: "spotify", href: "https://open.spotify.com/artist/3Osbsxro6xj9FhFzTfRgwL" },
  { name: "Apple Music", icon: "applemusic", href: "https://music.apple.com/dk/artist/thrkngs/943974854?l=da" },
  { name: "Deezer", icon: "deezer", href: "https://www.deezer.com/en/artist/7124191" },
  { name: "YouTube", icon: "youtube", href: "https://www.youtube.com/@thrkngs" },
];

const SOCIAL = [
  { name: "Instagram", icon: "instagram", href: "https://www.instagram.com/Thrkngs/" },
  { name: "Facebook", icon: "facebook", href: "https://www.facebook.com/thrkngs/" },
];

function SectionTitle({ children }) {
  return (
    <h2 className="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-ember-300/80">
      <span className="h-px w-6 bg-ember-500/60" />
      {children}
    </h2>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5L12 13l8.5-6.5" strokeLinecap="round" />
    </svg>
  );
}

// external links open in a new tab; mailto links stay put
function IconLink({ href, name, icon, children, external = true }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      aria-label={name}
      title={name}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-ember-900/60 bg-black/40 text-ember-200/80 transition-colors hover:border-ember-400 hover:bg-ember-500/15 hover:text-ember-50 hover:shadow-[0_0_14px_rgba(255,42,6,0.4)]"
    >
      {children ?? <BrandIcon name={icon} />}
    </a>
  );
}

// Rendered as a layer over the visualizer (see App), so the music keeps
// playing while someone browses; onBack closes the layer.
export default function StorePage({ onBack, isPlaying, playPause }) {

  return (
    <div className="relative min-h-dvh bg-black text-ember-100">
      {/* same film patina as the visualizer, fixed over the scrolling page */}
      <div className="pointer-events-none fixed inset-0 z-50">
        <Patina grain={0.05} vignette={0.6} />
      </div>

      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-[11px] tracking-[0.5em] text-ember-100/80 hover:text-ember-100"
        >
          <img src="/favicon-32.png" alt="" width="32" height="32" className="h-4 w-4 shrink-0 mix-blend-screen" />
          <span className="drop-shadow-[0_0_8px_rgba(255,60,30,0.6)]">T h r K n g s</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={playPause}
            aria-label={isPlaying ? "Pause music" : "Play music"}
            title={isPlaying ? "Pause" : "Play"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:border-ember-400/60 hover:text-ember-100"
          >
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
              <path d={isPlaying ? "M4 2.5h3v11H4zM9 2.5h3v11H9z" : "M4 2.5v11l9-5.5z"} />
            </svg>
          </button>
          <button
            onClick={onBack}
            className="flex h-8 items-center gap-2 rounded-full border border-white/10 px-3 text-[10px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:border-ember-400/60 hover:text-ember-100"
          >
            <span aria-hidden="true">←</span> Visuals
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        {/* Product */}
        <section aria-labelledby="vinyl-title" className="grid items-center gap-8 py-8 md:grid-cols-2 md:gap-12 md:py-14">
          <div className="relative mx-auto w-full max-w-md md:mr-[12%]">
            {/* the record peeking out of the sleeve */}
            <div
              aria-hidden="true"
              className="absolute inset-y-[4%] right-0 aspect-square translate-x-[12%] rounded-full border border-white/5 shadow-[0_0_40px_rgba(255,42,6,0.15)]"
              style={{
                background:
                  "radial-gradient(circle, #050202 0 1.5%, #ff2a06 2% 15%, #1a0805 15.5% 17%, transparent 17.5%), radial-gradient(circle, transparent 0 60%, rgba(255,140,110,0.06) 64%, transparent 68%), repeating-radial-gradient(circle, #0c0504 0 1.5px, #231210 1.5px 3px)",
              }}
            />
            <img
              src="/vinyl-cover.jpg"
              alt="ThrKngs vinyl cover: the ThrKngs mark light-painted in white over a night landscape"
              width="996"
              height="996"
              className="relative aspect-square w-full rounded-sm border border-ember-900/60 shadow-[0_0_60px_rgba(255,42,6,0.18)]"
            />
          </div>

          <div className="relative z-10 flex flex-col gap-5">
            <div className="text-[10px] uppercase tracking-[0.4em] text-ember-300/70">{VINYL.format}</div>
            <h1 id="vinyl-title" className="text-2xl tracking-[0.15em] text-ember-50 drop-shadow-[0_0_14px_rgba(255,60,30,0.45)] sm:text-3xl">
              {VINYL.title}
            </h1>
            <ul className="flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.2em] text-ember-300/80">
              {VINYL.specs.map((spec) => (
                <li key={spec} className="flex items-center gap-3">
                  <span className="h-px w-3 bg-ember-500/60" aria-hidden="true" />
                  {spec}
                </li>
              ))}
            </ul>

            <p className="max-w-sm text-[12px] leading-relaxed tracking-wide text-ember-200/70">
              Interested in the vinyl? Get in touch and we&rsquo;ll get back to you about availability, price and
              shipping.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Inquiry: ${VINYL.title} (${VINYL.format})`)}`}
              title={CONTACT_EMAIL}
              className="flex h-10 w-fit items-center gap-3 rounded border border-ember-400 bg-ember-500/20 px-5 text-xs uppercase tracking-[0.25em] text-ember-50 shadow-[0_0_14px_rgba(255,42,6,0.45)] transition-colors hover:bg-ember-500/35"
            >
              <MailIcon />
              Click here to get in touch
            </a>
          </div>
        </section>

        {/* Listen · Follow · Contact spread across the row, edge to edge with the
            cover and header above; a two-column grid on phones */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-ember-900/30 pt-10 md:flex md:flex-wrap md:justify-between md:gap-x-12">
          {/* Listen */}
          <section aria-labelledby="listen-title" className="col-span-2">
            <SectionTitle>
              <span id="listen-title">Listen</span>
            </SectionTitle>
            <div className="flex flex-wrap gap-3">
              {STREAMING.map((s) => (
                <IconLink key={s.name} {...s} />
              ))}
            </div>
          </section>

          {/* Follow */}
          <section aria-labelledby="follow-title">
            <SectionTitle>
              <span id="follow-title">Follow</span>
            </SectionTitle>
            <div className="flex flex-wrap gap-3">
              {SOCIAL.map((s) => (
                <IconLink key={s.name} {...s} />
              ))}
            </div>
          </section>

          {/* Contact */}
          <section aria-labelledby="contact-title" className="flex flex-col items-start md:items-end">
            <SectionTitle>
              <span id="contact-title">Contact</span>
            </SectionTitle>
            <div className="flex flex-wrap gap-3">
              <IconLink href={`mailto:${CONTACT_EMAIL}`} name={`Email ${CONTACT_EMAIL} (booking, press)`} external={false}>
                <MailIcon />
              </IconLink>
            </div>
          </section>
        </div>
      </main>

      <footer className="flex items-center justify-center gap-2 border-t border-ember-900/40 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-[10px] tracking-[0.3em] text-ember-300/40">
        <span>© {new Date().getFullYear()}</span>
        <img src="/favicon-32.png" alt="" width="32" height="32" className="h-4 w-4 shrink-0 mix-blend-screen" />
        <span>ThrKngs</span>
      </footer>
    </div>
  );
}
