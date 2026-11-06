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
import { FanZoneNote } from "@/components/games/FanZoneNote";
import { sessionWhen } from "@/lib/trivia";
import { PHOTOS } from "@/config/media";
import { fanZone, monthlyPrize } from "@/config/site";

export const metadata: Metadata = {
  title: "Lenko Army Fan Zone 🧠🖤 — Free Fan Activities",
  description: `${fanZone.description} Beat Breaker, Lenko Army Music Trivia, DMY Pool, Beat Tap and more — all free. Monthly fan appreciation prizes (from ${monthlyPrize}) are sponsored by Dark Music Yard.`,
  alternates: { canonical: "/games" },
};

export default async function GamesPage() {
  const [botd, trivia, prize] = await Promise.all([getBeatOfTheDay(), getTriviaSessionSafe(), getPrizePoolSafe("beat-breaker")]);
  // Open or still to come, by the clock now (the session lookup itself can be a few seconds old)
  const t = Date.now();
  const triviaOpen = Boolean(trivia?.open && trivia.startsAt && trivia.endsAt && Date.parse(trivia.startsAt) <= t && t < Date.parse(trivia.endsAt));
  const triviaWhen = trivia?.startsAt && trivia.endsAt && t < Date.parse(trivia.startsAt) ? sessionWhen(trivia.startsAt, trivia.endsAt) : null;
  const triviaPrize = trivia?.prizeGhs ?? 1500;
  // In the run-up (and while it's open) the trivia goes to the top of the page
  const examFirst = triviaOpen || Boolean(trivia?.open && trivia.startsAt && Date.parse(trivia.startsAt) - t < 3 * 86400e3 && t < Date.parse(trivia.startsAt));
  const examCard = (
    <Link
      href="/games/lenko-trivia"
      className={`group relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border bg-gradient-to-r p-5 transition sm:p-6 ${
        triviaOpen
          ? "border-red-500 from-red-600/25 via-ink-700/80 to-ink-700/80 shadow-[0_0_30px_rgba(220,38,38,0.35)] hover:border-red-400"
          : "border-yellow-400/40 from-yellow-400/10 via-ink-700/80 to-ink-700/80 hover:border-yellow-400"
      } ${examFirst ? "mb-3" : "mt-3"}`}
    >
      <div>
        <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${triviaOpen ? "text-red-300" : "text-yellow-400"}`}>
          Free monthly music trivia · {triviaOpen ? "🔴 Live now — 10 minutes only" : triviaWhen ? `Next: ${triviaWhen}` : "Last day of the month, 12:00"}
        </p>
        <p className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">🧠 Lenko Army Music Trivia</p>
        <p className="mt-1 text-sm text-neutral-300">
          Questions on Lenko Psycho&apos;s songs, lyrics, videos and collaborations — the last day of every month at 12:00 noon. Tap for your question
          any time in the 10 minutes and answer it within 2 minutes. Everyone who gets it right shares a GH₵{triviaPrize.toLocaleString()} fan
          appreciation prize sponsored by DMY.
        </p>
      </div>
      <span className="btn-accent min-h-[48px]">{triviaOpen ? "Take part →" : examFirst ? "Get ready →" : "See how it works →"}</span>
    </Link>
  );
  return (
    <>
      <PageHeader
        eyebrow="Official DMY fan engagement"
        title={`${fanZone.name} ${fanZone.icons}`}
        subtitle={fanZone.description}
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page pt-8 sm:pt-12">
        {examFirst && examCard}
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
        {!examFirst && examCard}
      </section>
      <section className="container-page py-8 sm:py-12">
        <GamesGrid />
        <FanZoneNote className="mt-8" />
      </section>
    </>
  );
}
