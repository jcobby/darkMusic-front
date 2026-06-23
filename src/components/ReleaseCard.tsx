import Link from "next/link";
import type { Release } from "@/lib/api";
import { releasePreviewUrl } from "@/lib/api";
import { CoverArt } from "./CoverArt";
import { StreamingLinks } from "./StreamingLinks";
import { AddToCartButton } from "./AddToCartButton";
import { PlayButton } from "./PlayButton";
import { SpotifyPlayButton } from "./SpotifyPlayButton";
import { spotifyEmbed } from "@/lib/spotify";

export function ReleaseCard({ release }: { release: Release }) {
  const spotifyPlayable = spotifyEmbed(release.spotifyUrl);
  return (
    <article className="card-hover group overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden">
        <Link href={`/music/${release.slug}`} className="absolute inset-0 z-0 block">
          <CoverArt
            src={release.coverImage}
            alt={release.title}
            label={release.title}
            className="transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-700 via-transparent to-transparent opacity-80" />
          <h3 className="absolute bottom-3 left-4 right-4 text-lg font-semibold text-white drop-shadow">
            {release.title}
          </h3>
        </Link>

        {release.isFeatured && (
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-ink/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent backdrop-blur">
            Featured
          </span>
        )}

        {spotifyPlayable ? (
          <SpotifyPlayButton
            url={release.spotifyUrl as string}
            className="absolute right-3 top-3 z-10 h-11 w-11"
          />
        ) : release.hasPreview ? (
          <PlayButton
            track={{
              id: `release:${release.id}`,
              title: release.title,
              src: releasePreviewUrl(release.slug),
              coverImage: release.coverImage,
              preview: true,
              fullHref: `/music/${release.slug}`,
            }}
            className="absolute right-3 top-3 z-10 h-11 w-11"
          />
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        <StreamingLinks
          links={{
            spotify: release.spotifyUrl,
            apple: release.appleUrl,
            youtube: release.youtubeUrl,
          }}
        />
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
          {release.downloadable ? (
            <>
              <span className="text-sm text-neutral-400">MP3 Download</span>
              <AddToCartButton
                kind="release_mp3"
                refId={release.id}
                name={release.title}
                priceGhs={release.priceGhs}
                image={release.coverImage}
                digital
                className="btn-accent px-4 py-2 text-xs"
                label={`MP3 · GH₵${release.priceGhs}`}
              />
            </>
          ) : (
            <Link
              href={`/music/${release.slug}`}
              className="btn-outline w-full px-4 py-2 text-xs"
            >
              Play &amp; details →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
