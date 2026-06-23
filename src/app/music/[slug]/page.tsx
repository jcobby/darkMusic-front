import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReleaseItem, releasePreviewUrl } from "@/lib/api";
import { CoverArt } from "@/components/CoverArt";
import { PlayButton } from "@/components/PlayButton";
import { SpotifyEmbed } from "@/components/SpotifyEmbed";
import { StreamingLinks } from "@/components/StreamingLinks";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { AddToCartButton } from "@/components/AddToCartButton";
import { PaymentBadges } from "@/components/PaymentBadges";
import { youtubeId } from "@/lib/youtube";
import { spotifyEmbed } from "@/lib/spotify";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const release = await getReleaseItem(slug);
  return { title: release ? release.title : "Release" };
}

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const release = await getReleaseItem(slug);
  if (!release) notFound();

  const hasVideo = Boolean(youtubeId(release.youtubeUrl));
  const spotifyPlayable = spotifyEmbed(release.spotifyUrl);

  return (
    <section className="container-page py-12">
      <Link href="/music" className="btn-ghost mb-6 px-0 text-sm">
        ← Back to music
      </Link>

      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Cover + buy */}
        <div>
          <div className="card relative aspect-square overflow-hidden">
            <CoverArt src={release.coverImage} alt={release.title} label={release.title} />
            {!spotifyPlayable && release.hasPreview && (
              <PlayButton
                track={{
                  id: `release:${release.id}`,
                  title: release.title,
                  src: releasePreviewUrl(release.slug),
                  coverImage: release.coverImage,
                  preview: true,
                }}
                className="absolute bottom-4 right-4 h-14 w-14 shadow-glow"
              />
            )}
          </div>

          {release.isFeatured && (
            <span className="mt-4 inline-block rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
              Featured
            </span>
          )}
          <h1 className="display-sm mt-3 text-white">{release.title}</h1>

          {release.downloadable && (
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-ink-700/70 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Own the MP3</p>
                <p className="text-xs text-neutral-500">Instant download · supports the artist directly</p>
              </div>
              <AddToCartButton
                kind="release_mp3"
                refId={release.id}
                name={release.title}
                priceGhs={release.priceGhs}
                image={release.coverImage}
                digital
                className="btn-accent"
                label={`MP3 · GH₵${release.priceGhs}`}
              />
            </div>
          )}

          <div className="mt-5">
            <p className="label">Also on</p>
            <StreamingLinks
              links={{
                spotify: release.spotifyUrl,
                apple: release.appleUrl,
                youtube: release.youtubeUrl,
              }}
              size="md"
            />
          </div>

          {release.downloadable && (
            <div className="mt-6 border-t border-white/[0.06] pt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Payment methods</p>
              <PaymentBadges />
            </div>
          )}
        </div>

        {/* Players */}
        <div className="space-y-6">
          <div>
            <p className="eyebrow mb-3">
              <span className="h-px w-6 bg-accent" />
              Stream now
            </p>
            <SpotifyEmbed url={release.spotifyUrl} title={`${release.title} on Spotify`} />
          </div>

          {hasVideo && (
            <div>
              <p className="eyebrow mb-3">
                <span className="h-px w-6 bg-accent" />
                Watch
              </p>
              <YouTubeEmbed url={release.youtubeUrl} title={release.title} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
