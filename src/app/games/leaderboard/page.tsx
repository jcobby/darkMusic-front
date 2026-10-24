import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { FullLeaderboard } from "@/components/games/FullLeaderboard";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Beat Breaker Leaderboard — Win GH₵500 Every Month",
  description:
    "See who's winning this month's GH₵500 Beat Breaker prize on Dark Music Yard — every player's rank, score and level, and where you stand.",
  alternates: { canonical: "/games/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Beat Breaker · Monthly prize"
        title="Leaderboard"
        subtitle="Where every player stands this month and this week. Whoever's on top when the month ends wins the prize pool — paid into their DMY wallet."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page py-8 sm:py-12">
        <FullLeaderboard />
      </section>
    </>
  );
}
