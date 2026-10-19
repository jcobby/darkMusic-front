import Link from "next/link";
import { CoverArt } from "./CoverArt";
import { SpotifyEmbed } from "./SpotifyEmbed";
import { SpotifyPlayButton } from "./SpotifyPlayButton";
import { TrackActions } from "./TrackActions";
import { Reveal } from "./Reveal";
import type { SitePhoto } from "@/config/media";

/** What the spotlight shows — from the catalogue, or from `latestRelease` before it's added there. */
export interface SpotlightRelease {
  title: string;
  artist: string;
  coverImage: string | null;
  spotifyUrl: string | null;
  appleUrl: string | null;
  youtubeUrl: string | null;
  /** The release page when the MP3 is on sale there. */
  downloadHref: string | null;
  /** What "Share this track" sends. */
  shareUrl: string;
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
    <section id="latest" className="relative scroll-mt-20 overflow-hidden py-12 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(191,0,255,0.16),transparent)]" />
      <div className="container-page relative">
        <Reveal>
          <div className="grid items-center gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
            {/* Cover — tap the big button to play it in the site player (keeps playing across pages) */}
            <div className="relative mx-auto w-full max-w-[17rem] sm:max-w-sm">
              <div className="card relative aspect-square overflow-hidden shadow-glow">
                <CoverArt src={release.coverImage} alt={`${release.title} by ${release.artist} — cover art`} label={release.title} />
                {release.spotifyUrl && (
                  <SpotifyPlayButton
                    url={release.spotifyUrl}
                    className="absolute bottom-4 right-4 h-16 w-16 shadow-glow"
                  />
                )}
              </div>
              {/* Sits on the frame's edge so it never covers the artwork's lettering */}
              <span className="absolute -top-3 left-5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-glow-sm">
                NEW RELEASE
              </span>
            </div>

            {/* Info */}
            <div>
              <p className="eyebrow mb-3">
                <span className="h-px w-6 bg-accent" /> Out Now
              </p>
              <h2 className="display-sm text-white text-balance">{release.title}</h2>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-neutral-300 sm:mt-4">
                {blurb ??
                  "The newest drop from Lenko Psycho — out now on every platform. Stream it, share it, and watch the visuals."}
              </p>
              {credits && <p className="mt-2 text-xs uppercase tracking-wider text-neutral-500">{credits}</p>}

              {release.spotifyUrl && (
                <div className="mt-5 max-w-lg sm:mt-6">
                  <SpotifyEmbed url={release.spotifyUrl} compact title={`${release.title} on Spotify`} />
                </div>
              )}

              <div className="mt-5 max-w-lg">
                <TrackActions
                  title={release.title}
                  artist={release.artist}
                  spotifyUrl={release.spotifyUrl}
                  appleUrl={release.appleUrl}
                  youtubeUrl={release.youtubeUrl}
                  downloadHref={release.downloadHref}
                  shareUrl={release.shareUrl}
                />
              </div>
              <Link
                href="/music"
                className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
              >
                All releases →
              </Link>
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
                  <Link key={photo.src} href="/behind-the-scenes" className="card-hover block aspect-[3/4] overflow-hidden">
                    <CoverArt src={photo.src} alt={photo.alt} />
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
