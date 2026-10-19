import Link from "next/link";
import { latestRelease } from "@/config/site";
import { CoverArt } from "./CoverArt";
import { SpotifyEmbed } from "./SpotifyEmbed";

/** Wide "Out now" card for the current single — Music and About pages.
 *  `href` is its release page once it's in the catalogue; otherwise "Listen now" goes to Spotify. */
export function LatestReleaseBanner({
  href,
  eyebrow = "Latest release",
  more,
}: {
  href?: string;
  eyebrow?: string;
  /** Optional second link, e.g. to the full catalogue. */
  more?: { href: string; label: string };
}) {
  const r = latestRelease;
  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_0%_0%,rgba(191,0,255,0.18),transparent)]" />
      <div className="relative grid items-center gap-5 sm:grid-cols-[150px_1fr] lg:grid-cols-[170px_1fr_minmax(0,22rem)] lg:gap-7">
        <div className="mx-auto aspect-square w-40 overflow-hidden rounded-2xl border border-white/10 shadow-glow-sm sm:w-full">
          <CoverArt src={r.coverImage} alt={`${r.title} cover`} label={r.title} width={400} />
        </div>
        <div className="text-center sm:text-left">
          <p className="eyebrow mb-2 justify-center sm:justify-start">
            <span className="h-px w-6 bg-accent" /> {eyebrow}
          </p>
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">{r.title}</h2>
          <p className="mt-1 text-neutral-300">
            {r.artist}
            {r.featuring && (
              <>
                {" "}
                <span className="text-neutral-500">ft.</span> {r.featuring}
              </>
            )}
          </p>
          <p className="mt-2 text-xs uppercase tracking-wider text-neutral-500">{r.credits}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
            {href ? (
              <Link href={href} className="btn-accent">
                Listen now
              </Link>
            ) : (
              <a href={r.spotifyUrl} target="_blank" rel="noopener noreferrer" className="btn-accent">
                Listen now
              </a>
            )}
            {more && (
              <Link href={more.href} className="btn-outline">
                {more.label}
              </Link>
            )}
          </div>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <SpotifyEmbed url={r.spotifyUrl} compact title={`${r.title} on Spotify`} />
        </div>
      </div>
    </div>
  );
}
