import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { FullLeaderboard } from "@/components/games/FullLeaderboard";
import { HallOfFame } from "@/components/games/HallOfFame";
import { getPrizePoolSafe } from "@/lib/api";
import { PHOTOS } from "@/config/media";
import { fanRewards, monthlyPrize } from "@/config/site";

export const metadata: Metadata = {
  title: `Beat Breaker Fan Rankings — Lenko Army Fan Zone`,
  description: `Fan participation and engagement rankings for Beat Breaker on Dark Music Yard. Free to play — no entry fee, no purchase necessary. The top fan each month receives a ${monthlyPrize} fan appreciation prize sponsored by Dark Music Yard.`,
  alternates: { canonical: "/games/leaderboard" },
};

export default async function LeaderboardPage() {
  const prize = await getPrizePoolSafe("beat-breaker");
  return (
    <>
      <PageHeader
        eyebrow={`${fanRewards.name} ${fanRewards.icons} · Beat Breaker`}
        title="Fan Rankings"
        subtitle="Fan participation and engagement rankings for this month and this week. Free to play — the fan on top when the month ends receives the fan appreciation prize sponsored by DMY."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page py-8 sm:py-12">
        <FullLeaderboard />
        <HallOfFame winners={prize?.winners ?? []} className="mx-auto mt-8 max-w-3xl" />
      </section>
    </>
  );
}
