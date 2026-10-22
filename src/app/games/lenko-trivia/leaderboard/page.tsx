import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { TriviaBoardList } from "@/components/games/TriviaBoard";
import { getTriviaBoard } from "@/lib/api";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Lenko Trivia Leaderboard — GH₵1,000 Prize Pool",
  description: "Everyone who got their Lenko Trivia question right, round by round — the GH₵1,000 prize board.",
  alternates: { canonical: "/games/lenko-trivia/leaderboard" },
};

export default async function Page() {
  const board = await getTriviaBoard();
  return (
    <>
      <PageHeader
        eyebrow="Lenko Trivia · Prize pool"
        title="Leaderboard"
        subtitle="Everyone who got their question right. Answers stay private — the board only shows who got theirs right, once their round is over."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <TriviaBoardList initial={board} />
          <div className="mt-6 text-center">
            <Link href="/games/lenko-trivia" className="btn-accent min-h-[48px]">
              Play Lenko Trivia →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
