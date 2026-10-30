import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { TriviaBoardList } from "@/components/games/TriviaBoard";
import { getTriviaBoard } from "@/lib/api";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "LA End of Month Exam Results — GH₵1,500 Prize",
  description: "Everyone who passed this month's LA End of Month Exam (Lenko Trivia) — they share the GH₵1,500.",
  alternates: { canonical: "/games/lenko-trivia/leaderboard" },
};

export default async function Page() {
  const board = await getTriviaBoard();
  return (
    <>
      <PageHeader
        eyebrow="LA End of Month Exam · Real Ones Only"
        title="Results"
        subtitle="Everyone who got their question right this month passed — they share the prize. Answers stay private: the board only shows who passed, once their 2 minutes are up."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <TriviaBoardList initial={board} />
          <div className="mt-6 text-center">
            <Link href="/games/lenko-trivia" className="btn-accent min-h-[48px]">
              The exam →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
