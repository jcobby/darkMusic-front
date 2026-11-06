import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { TriviaBoardList } from "@/components/games/TriviaBoard";
import { getTriviaBoard } from "@/lib/api";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Lenko Army Music Trivia Results",
  description: "Everyone who got this month's Lenko Army Music Trivia question right — they share the GH₵1,500 fan appreciation prize sponsored by Dark Music Yard.",
  alternates: { canonical: "/games/lenko-trivia/leaderboard" },
};

export default async function Page() {
  const board = await getTriviaBoard();
  return (
    <>
      <PageHeader
        eyebrow="Lenko Army Music Trivia · Lenko Army Fan Zone"
        title="Results"
        subtitle="Everyone who got their question right this month shares the fan appreciation prize sponsored by DMY. Answers stay private: the board only shows who got it right, once their 2 minutes are up."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <TriviaBoardList initial={board} />
          <div className="mt-6 text-center">
            <Link href="/games/lenko-trivia" className="btn-accent min-h-[48px]">
              The trivia →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
