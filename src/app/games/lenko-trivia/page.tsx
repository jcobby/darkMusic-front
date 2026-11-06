import type { Metadata } from "next";
import { getTriviaBoard, getTriviaSessionSafe } from "@/lib/api";
import { LenkoTrivia } from "@/components/games/LenkoTrivia";

export const metadata: Metadata = {
  title: "Lenko Army Music Trivia — Lenko Army Fan Zone",
  description:
    "Lenko Army Music Trivia: a free monthly music knowledge and fan appreciation activity on Lenko Psycho's songs, lyrics, music videos, collaborations and Dark Music Yard releases. The last day of every month at 12:00 noon — answer your question within 2 minutes. Everyone who gets it right shares a GH₵1,500 fan appreciation prize sponsored by Dark Music Yard. No purchase necessary.",
  alternates: { canonical: "/games/lenko-trivia" },
};

export default async function Page() {
  const [board, session] = await Promise.all([getTriviaBoard(), getTriviaSessionSafe()]);
  return <LenkoTrivia initialBoard={board} initialSession={session} />;
}
