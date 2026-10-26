import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { GamesGrid } from "@/components/games/GamesGrid";
import { LeaderboardTeaser } from "@/components/games/LeaderboardTeaser";
import { EventsStrip } from "@/components/games/Events";
import { BeatOfTheDayCard } from "@/components/games/BeatOfTheDayCard";
import { getBeatOfTheDay } from "@/lib/api";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Free Music Games — Win GH₵500 in Beat Breaker",
  description:
    "Free browser games played to Dark Music Yard's beats: Beat Breaker (top the board each month to win GH₵500), Beat Tap, Vinyl Catch, Memory Match, Name That Cover and DMY Trivia.",
  alternates: { canonical: "/games" },
};

export default async function GamesPage() {
  const botd = await getBeatOfTheDay();
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
            <p className="mt-1 text-sm text-neutral-300">Whoever&apos;s on top of the board when the month ends takes it. Sign in, play, climb.</p>
          </div>
          <span className="btn-accent min-h-[48px]">Play &amp; compete →</span>
        </Link>
        <LeaderboardTeaser className="mt-3" />
        <EventsStrip className="mt-3" />
        <BeatOfTheDayCard botd={botd} className="mt-3" />
        <Link
          href="/games/squads"
          className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-800/80 p-4 transition hover:border-accent/60 sm:px-5"
        >
          <span>
            <span className="block font-semibold text-white">👥 Squads — team up with 3–5 fans</span>
            <span className="block text-sm text-neutral-400">Your Beat Breaker scores add up on the squad board, and your tag shows on every board.</span>
          </span>
          <span className="btn-outline min-h-[44px] text-sm">Squad up →</span>
        </Link>
        <Link
          href="/games/lenko-trivia"
          className="group relative mt-3 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-yellow-400/40 bg-gradient-to-r from-yellow-400/10 via-ink-700/80 to-ink-700/80 p-5 transition hover:border-yellow-400 sm:p-6"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">New · Members only · Live</p>
            <p className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">🧠 Lenko Trivia — GH₵1,000 every month</p>
            <p className="mt-1 text-sm text-neutral-300">
              When 10 players are ready at the same time, everyone gets a question and 2 minutes. Get yours right to make the month&apos;s board — everyone on it
              shares the GH₵1,000 when the month ends.
            </p>
          </div>
          <span className="btn-accent min-h-[48px]">Join the lobby →</span>
        </Link>
      </section>
      <section className="container-page py-8 sm:py-12">
        <GamesGrid />
      </section>
    </>
  );
}
