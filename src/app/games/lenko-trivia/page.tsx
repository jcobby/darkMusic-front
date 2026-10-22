import type { Metadata } from "next";
import { getTriviaBoard } from "@/lib/api";
import { LenkoTrivia } from "@/components/games/LenkoTrivia";

export const metadata: Metadata = {
  title: "Lenko Trivia · Games",
  description:
    "Live Lenko Psycho trivia for Dark Music Yard members: when 10 players are ready at the same time, everyone gets a question and 2 minutes. Right answers make the GH₵1,000 prize board.",
  alternates: { canonical: "/games/lenko-trivia" },
};

export default async function Page() {
  return <LenkoTrivia initialBoard={await getTriviaBoard()} />;
}
