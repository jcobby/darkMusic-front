import type { Metadata } from "next";
import { getBeatOfTheDay, getBeats } from "@/lib/api";
import { featuredBeat, toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { Trivia } from "@/components/games/Trivia";

export const metadata: Metadata = {
  title: "DMY Trivia · Games",
  description: "How well do you know Lenko Psycho and Dark Music Yard?",
};

export default async function Page() {
  // DMY's free beats are the soundtrack.
  const [all, botd] = await Promise.all([getBeats(), getBeatOfTheDay()]);
  const beats = toFreeBeats(all);
  return (
    <SoundtrackProvider beats={beats} featured={featuredBeat(botd)}>
      <Trivia />
    </SoundtrackProvider>
  );
}