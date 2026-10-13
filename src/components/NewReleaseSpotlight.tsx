import Link from "next/link";
import { CoverArt } from "./CoverArt";
import { StreamingLinks } from "./StreamingLinks";
import { SpotifyEmbed } from "./SpotifyEmbed";
import { Reveal } from "./Reveal";
import type { SitePhoto } from "@/config/media";

/** What the spotlight shows — from the catalogue, or from `latestRelease` before it's added there. */
export interface SpotlightRelease {
  title: string;
  coverImage: string | null;
  /** "Listen now": the release page when it's in the catalogue, otherwise Spotify. */
  href: string;
  external: boolean;
  spotifyUrl: string | null;
  appleUrl: string | null;
  youtubeUrl: string | null;
}

/** Big "out now" spotlight for the newest release (with an in-page Spotify
 *  player), plus an optional behind-the-scenes photo strip. High on the home page. */
export function NewReleaseSpotlight({
  release,
  gallery = [],
  blurb,
  credits,
}: {
  release: SpotlightRelease;
  gallery?: SitePhoto[];
  blurb?: string;
  credits?: string;
}) {
  return (
    <section id="latest" className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(255,31,61,0.16),transparent)]" />
      <div className="container-page relative">
        <Reveal>
          <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            {/* Cover */}
            <div className="mx-auto w-full max-w-sm">
              <div className="card relative aspect-square overflow-hidden shadow-glow">
                <CoverArt src={release.coverImage} alt={`${release.title} cover`} label={release.title} />
                <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-glow-sm">
                  NEW RELEASE
                </span>
              </div>
            </div>

            {/* Info */}
            <div>
              <p className="eyebrow mb-3">
                <span className="h-px w-6 bg-accent" /> Out Now
              </p>
              <h2 className="display-sm text-white text-balance">{release.title}</h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-300">
                {blurb ??
                  "The newest drop from Lenko Psycho — out now on every platform. Stream it, share it, and watch the visuals."}
              </p>
              {credits && <p className="mt-2 text-xs uppercase tracking-wider text-neutral-500">{credits}</p>}

              {release.spotifyUrl && (
                <div className="mt-6 max-w-lg">
                  <SpotifyEmbed url={release.spotifyUrl} compact title={`${release.title} on Spotify`} />
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {release.external ? (
                  <a href={release.href} target="_blank" rel="noopener noreferrer" className="btn-accent">
                    Listen now
                  </a>
                ) : (
                  <Link href={release.href} className="btn-accent">
                    Listen now
                  </Link>
                )}
              </div>

              <div className="mt-6">
                <p className="label">Stream on</p>
                <StreamingLinks
                  links={{ spotify: release.spotifyUrl, apple: release.appleUrl, youtube: release.youtubeUrl }}
                  size="md"
                />
              </div>
            </div>
          </div>
        </Reveal>

        {gallery.length > 0 && (
          <Reveal delay={0.1}>
            <div className="mt-12">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="eyebrow">
                  <span className="h-px w-6 bg-accent" /> Behind the scenes at DMY
                </p>
                <Link href="/behind-the-scenes" className="text-sm font-semibold text-accent hover:underline">
                  See all photos →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {gallery.map((photo) => (
                  <div key={photo.src} className="card-hover aspect-[3/4] overflow-hidden">
                    <CoverArt src={photo.src} alt={photo.alt} />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
