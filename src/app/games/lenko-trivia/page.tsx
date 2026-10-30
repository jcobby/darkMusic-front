import type { Metadata } from "next";
import { getTriviaBoard, getTriviaSessionSafe } from "@/lib/api";
import { LenkoTrivia } from "@/components/games/LenkoTrivia";

export const metadata: Metadata = {
  title: "LA End of Month Exam — Lenko Trivia · Games",
  description:
    "The LA End of Month Exam: Lenko Psycho trivia for Dark Music Yard members on the last day of every month at 12:00 noon. Tap for your question and answer it within 2 minutes — everyone who passes shares GH₵1,500. Real ones only.",
  alternates: { canonical: "/games/lenko-trivia" },
};

export default async function Page() {
  const [board, session] = await Promise.all([getTriviaBoard(), getTriviaSessionSafe()]);
  return <LenkoTrivia initialBoard={board} initialSession={session} />;
}
