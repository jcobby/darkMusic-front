import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { FullLeaderboard } from "@/components/games/FullLeaderboard";
import { HallOfFame } from "@/components/games/HallOfFame";
import { getPrizePoolSafe } from "@/lib/api";
import { PHOTOS } from "@/config/media";
import { fanRewards, monthlyPrize } from "@/config/site";

export const metadata: Metadata = {
  title: `Beat Breaker Leaderboard — DMY Fan Rewards: Win ${monthlyPrize} Every Month`,
  description: `See who's winning this month's Beat Breaker prize on Dark Music Yard (${monthlyPrize} every month — no entry fee, no purchase or donation required): every player's rank, score and level, and where you stand.`,
  alternates: { canonical: "/games/leaderboard" },
};

export default async function LeaderboardPage() {
  const prize = await getPrizePoolSafe("beat-breaker");
  return (
    <>
      <PageHeader
        eyebrow={`${fanRewards.name} ${fanRewards.icons} · Beat Breaker`}
        title="Leaderboard"
        subtitle="Where every player stands this month and this week. Whoever's on top when the month ends wins the prize pool — paid into their DMY wallet."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page py-8 sm:py-12">
        <FullLeaderboard />
        <HallOfFame winners={prize?.winners ?? []} className="mx-auto mt-8 max-w-3xl" />
      </section>
    </>
  );
}
