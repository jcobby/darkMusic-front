import type { Metadata } from "next";
import { getReleases } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PHOTOS } from "@/config/media";
import { ReleaseCard } from "@/components/ReleaseCard";
import { Reveal } from "@/components/Reveal";
import { LatestReleaseBanner } from "@/components/LatestReleaseBanner";
import { latestRelease } from "@/config/site";

export const metadata: Metadata = {
  title: "Music — Lenko Psycho Songs & New Releases",
  description:
    "Stream every Lenko Psycho release — Stubborn Abele, It's Working, Shiver and more — on Spotify, Apple Music and YouTube, or download the MP3 to support directly.",
  alternates: { canonical: "/music" },
};

export default async function MusicPage() {
  const releases = await getReleases();
  const inCatalogue = releases.some((r) => r.slug === latestRelease.slug);

  return (
    <>
      <PageHeader
        eyebrow="Music"
        title="Releases"
        subtitle="Stream on Spotify, Apple Music and YouTube. Selected releases are available as MP3 downloads."
        image={PHOTOS.carRedSeats}
      />
      <section className="container-page pt-12">
        <Reveal>
          <LatestReleaseBanner href={inCatalogue ? `/music/${latestRelease.slug}` : undefined} />
        </Reveal>
      </section>
      <section className="container-page py-12">
        {releases.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {releases.map((r, i) => (
              <Reveal key={r.id} delay={(i % 3) * 0.08}>
                <ReleaseCard release={r} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-neutral-500">
            New music is on the way — check back soon.
          </div>
        )}
      </section>
    </>
  );
}
