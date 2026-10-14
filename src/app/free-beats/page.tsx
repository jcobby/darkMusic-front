import type { Metadata } from "next";
import Link from "next/link";
import { getBeats } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PHOTOS } from "@/config/media";
import { BeatCard } from "@/components/BeatCard";
import { Reveal } from "@/components/Reveal";
import { SupportCard, SupportFab } from "@/components/SupportTheYard";

export const metadata: Metadata = {
  title: "Free Beats — Free Hip-Hop Instrumentals (MP3 Download)",
  description:
    "Download free hip-hop and Afro instrumentals from Dark Music Yard — free MP3s to record on, plus studio WAVs. Produced in Ghana.",
  alternates: { canonical: "/free-beats" },
};

export default async function FreeBeatsPage() {
  const beats = await getBeats();

  return (
    <>
      <PageHeader
        eyebrow="Free Beats"
        title="Beats for Artists & Creators"
        subtitle="Download the MP3 free to create with. Grab the original high-quality studio WAV for GH₵200."
        image={PHOTOS.lounge}
      />
      <section className="container-page pt-8 sm:pt-12">
        <SupportCard />
      </section>
      <section className="container-page py-8 sm:py-12">
        {beats.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {beats.map((b, i) => (
              <Reveal key={b.id} delay={(i % 3) * 0.08}>
                <BeatCard beat={b} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-neutral-500">
            New beats are on the way — check back soon.
          </div>
        )}
      </section>

      {/* Every DMY game is played to these beats */}
      <section className="container-page pb-16">
        <Reveal>
          <Link
            href="/games"
            className="group relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[2rem] border border-accent/30 bg-gradient-to-r from-accent-deep/40 via-ink-700/80 to-ink-700/80 p-7 transition-colors hover:border-accent/70 sm:p-9"
          >
            <div className="max-w-xl">
              <p className="eyebrow mb-2">
                <span className="h-px w-6 bg-accent" /> Play these beats
              </p>
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Every DMY game runs on these beats
              </h2>
              <p className="mt-2 text-sm text-neutral-300">
                Smash bricks on the kick in Beat Breaker, tap the drums in Beat Tap, catch records in Vinyl Catch.
                Free, no sign-in.
              </p>
            </div>
            <span className="btn-accent">Play the games →</span>
          </Link>
        </Reveal>
      </section>
      <SupportFab />
    </>
  );
}
