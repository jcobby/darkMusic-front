import type { Metadata } from "next";
import { getReleases } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ReleaseCard } from "@/components/ReleaseCard";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Music",
  description: "Stream DMY releases on Spotify, Apple Music and YouTube, or buy the MP3.",
};

export default async function MusicPage() {
  const releases = await getReleases();

  return (
    <>
      <PageHeader
        eyebrow="Music"
        title="Releases"
        subtitle="Stream on Spotify, Apple Music and YouTube. Selected releases are available as MP3 downloads."
      />
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
            No releases yet. Add them from the{" "}
            <a href="/admin" className="text-accent">
              admin dashboard
            </a>
            .
          </div>
        )}
      </section>
    </>
  );
}
