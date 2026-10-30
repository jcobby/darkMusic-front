import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { GamesGrid } from "@/components/games/GamesGrid";
import { LeaderboardTeaser } from "@/components/games/LeaderboardTeaser";
import { EventsStrip } from "@/components/games/Events";
import { BeatOfTheDayCard } from "@/components/games/BeatOfTheDayCard";
import { getBeatOfTheDay, getPrizePoolSafe, getTriviaSessionSafe } from "@/lib/api";
import { HallOfFame } from "@/components/games/HallOfFame";
import { FanRewardsCard } from "@/components/games/FanRewards";
import { sessionWhen } from "@/lib/trivia";
import { PHOTOS } from "@/config/media";
import { monthlyPrize } from "@/config/site";

export const metadata: Metadata = {
  title: `Free Music Games — DMY Fan Rewards: Win ${monthlyPrize} Every Month`,
  description: `Free browser games played to Dark Music Yard's beats: Beat Breaker (top the board each month to win ${monthlyPrize} — no entry fee, no purchase or donation required), DMY Pool, the LA End of Month Exam, Beat Tap, Vinyl Catch, Memory Match and more.`,
  alternates: { canonical: "/games" },
};

export default async function GamesPage() {
  const [botd, trivia, prize] = await Promise.all([getBeatOfTheDay(), getTriviaSessionSafe(), getPrizePoolSafe("beat-breaker")]);
  // Open or still to come, by the clock now (the session lookup itself can be a few seconds old)
  const t = Date.now();
  const triviaOpen = Boolean(trivia?.open && trivia.startsAt && trivia.endsAt && Date.parse(trivia.startsAt) <= t && t < Date.parse(trivia.endsAt));
  const triviaWhen = trivia?.startsAt && trivia.endsAt && t < Date.parse(trivia.startsAt) ? sessionWhen(trivia.startsAt, trivia.endsAt) : null;
  const triviaPrize = trivia?.prizeGhs ?? 1500;
  return (
    <>
      <PageHeader
        eyebrow="Play"
        title="DMY Games"
        subtitle="Every game plays to DMY's free beats — free, no download. Sign in to put your Beat Breaker score on the monthly prize leaderboard."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page pt-8 sm:pt-12">
        <FanRewardsCard triviaPrizeGhs={triviaPrize} />
        <LeaderboardTeaser className="mt-3" />
        <HallOfFame winners={prize?.winners ?? []} className="mt-3" />
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
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">
              Real Ones Only · {triviaOpen ? "Open now" : triviaWhen ? `Next: ${triviaWhen}` : "Last day of the month, 12:00"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">🧠 LA End of Month Exam — GH₵{triviaPrize.toLocaleString()}</p>
            <p className="mt-1 text-sm text-neutral-300">
              Lenko Trivia, the last day of every month at 12:00 noon: tap for your question any time in the 10 minutes and answer it within 2 minutes.
              Everyone who passes shares the GH₵{triviaPrize.toLocaleString()}.
            </p>
          </div>
          <span className="btn-accent min-h-[48px]">{triviaOpen ? "Play now →" : "See how it works →"}</span>
        </Link>
      </section>
      <section className="container-page py-8 sm:py-12">
        <GamesGrid />
      </section>
    </>
  );
}
