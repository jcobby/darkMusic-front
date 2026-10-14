import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReleaseItem, getReleases, releasePreviewUrl } from "@/lib/api";
import { SectionHeading } from "@/components/SectionHeading";
import { ShareButton } from "@/components/TrackActions";
import { BarForBar } from "@/components/BarForBar";
import { JsonLd, ARTIST_ID, ORG_ID } from "@/components/JsonLd";
import { site } from "@/config/site";
import { ReleaseCard } from "@/components/ReleaseCard";
import { CoverArt } from "@/components/CoverArt";
import { PlayButton } from "@/components/PlayButton";
import { StreamFullButton } from "@/components/StreamFullButton";
import { SpotifyEmbed } from "@/components/SpotifyEmbed";
import { StreamingLinks } from "@/components/StreamingLinks";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { AddToCartButton } from "@/components/AddToCartButton";
import { PaymentBadges } from "@/components/PaymentBadges";
import { youtubeId } from "@/lib/youtube";
import { spotifyEmbed } from "@/lib/spotify";

// Each release page is built on its first visit, then served from cache and refreshed every minute.
export const revalidate = 60;
export const generateStaticParams = () => [];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const release = await getReleaseItem(slug);
  if (!release) return { title: "Release" };
  const description = `Listen to “${release.title}” by Lenko Psycho — stream on Spotify, Apple Music and YouTube${
    release.downloadable ? ", or download the MP3 to support directly" : ""
  }. A Dark Music Yard release.`;
  return {
    title: `${release.title} — Lenko Psycho`,
    description,
    alternates: { canonical: `/music/${release.slug}` },
    openGraph: {
      type: "music.song",
      title: `${release.title} — Lenko Psycho`,
      description,
      images: release.coverImage ? [release.coverImage] : undefined,
    },
  };
}

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [release, all] = await Promise.all([getReleaseItem(slug), getReleases()]);
  if (!release) notFound();

  const hasVideo = Boolean(youtubeId(release.youtubeUrl));
  const spotifyPlayable = spotifyEmbed(release.spotifyUrl);
  const more = all.filter((r) => r.slug !== release.slug).slice(0, 3);

  return (
    <>
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: release.title,
        url: `${site.url}/music/${release.slug}`,
        image: release.coverImage,
        byArtist: { "@type": "MusicGroup", "@id": ARTIST_ID, name: "Lenko Psycho" },
        recordLabel: { "@id": ORG_ID },
        sameAs: [release.spotifyUrl, release.appleUrl, release.youtubeUrl].filter(Boolean),
      }}
    />
    <section className="container-page py-8 sm:py-12">
      <Link href="/music" className="btn-ghost mb-6 px-0 text-sm">
        ← Back to music
      </Link>

      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Cover + buy */}
        <div>
          <div className="card relative aspect-square overflow-hidden">
            <CoverArt src={release.coverImage} alt={`${release.title} by Lenko Psycho — cover art`} label={release.title} width={1000} />
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

          {release.hasPreview && (
            <div className="mt-5">
              <StreamFullButton
                slug={release.slug}
                id={release.id}
                title={release.title}
                coverImage={release.coverImage}
              />
            </div>
          )}

          {release.downloadable && (
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-ink-700/70 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Get the MP3 — name your price</p>
                <p className="text-xs text-neutral-500">
                  Donate any amount (min GH₵5) and download · supports the artist directly
                </p>
              </div>
              <AddToCartButton
                kind="release_mp3"
                refId={release.id}
                name={release.title}
                priceGhs={release.priceGhs}
                image={release.coverImage}
                digital
                className="btn-accent"
                label="Donate to download MP3"
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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ShareButton title={`${release.title} — Lenko Psycho`} url={`${site.url}/music/${release.slug}`} />
            {release.spotifyUrl && (
              <a
                href={release.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm font-semibold text-neutral-300 transition hover:bg-white/5 hover:text-white"
              >
                + Add to your playlist
              </a>
            )}
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
          {release.spotifyUrl && (
            <div>
              <p className="eyebrow mb-3">
                <span className="h-px w-6 bg-accent" />
                Stream now
              </p>
              <SpotifyEmbed url={release.spotifyUrl} title={`${release.title} on Spotify`} />
            </div>
          )}

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

    {release.slug === "its-working" && <BarForBar compact />}

    {more.length > 0 && (
      <section className="container-page pb-16">
        <SectionHeading eyebrow="Keep listening" title="More from Lenko Psycho" href="/music" linkLabel="View all music" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {more.map((r) => (
            <ReleaseCard key={r.id} release={r} />
          ))}
        </div>
      </section>
    )}
    </>
  );
}
