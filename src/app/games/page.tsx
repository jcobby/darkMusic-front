import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { GamesGrid } from "@/components/games/GamesGrid";
import { LeaderboardTeaser } from "@/components/games/LeaderboardTeaser";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Free Music Games — Win GH₵500 in Beat Breaker",
  description:
    "Free browser games played to Dark Music Yard's beats: Beat Breaker (top score each month wins GH₵500), Beat Tap, Vinyl Catch, Memory Match, Name That Cover and DMY Trivia.",
  alternates: { canonical: "/games" },
};

export default function GamesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Play"
        title="DMY Games"
        subtitle="Every game plays to DMY's free beats — free, no download. Sign in to put your Beat Breaker score on the monthly prize leaderboard."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page pt-8 sm:pt-12">
        <Link
          href="/games/beat-breaker"
          className="group relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-accent/40 bg-gradient-to-r from-accent-deep/60 via-ink-700/80 to-ink-700/80 p-5 transition hover:border-accent sm:p-6"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Monthly prize</p>
            <p className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">🏆 Win GH₵500 in Beat Breaker</p>
            <p className="mt-1 text-sm text-neutral-300">The highest score at the end of each month takes it. Sign in, play, climb the board.</p>
          </div>
          <span className="btn-accent min-h-[48px]">Play &amp; compete →</span>
        </Link>
        <LeaderboardTeaser className="mt-3" />
      </section>
      <section className="container-page py-8 sm:py-12">
        <GamesGrid />
      </section>
    </>
  );
}
