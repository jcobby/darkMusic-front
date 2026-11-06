import type { Metadata } from "next";
import { getBeatOfTheDay, getBeats } from "@/lib/api";
import { featuredBeat, toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { MemoryMatch } from "@/components/games/MemoryMatch";

export const metadata: Metadata = {
  title: "Memory Match · Lenko Army Fan Zone",
  description: "Pair up photos from DMY's video shoots — to a soundtrack of DMY free beats.",
};

export default async function Page() {
  // DMY's free beats are the soundtrack.
  const [all, botd] = await Promise.all([getBeats(), getBeatOfTheDay()]);
  const beats = toFreeBeats(all);
  return (
    <SoundtrackProvider beats={beats} featured={featuredBeat(botd)}>
      <MemoryMatch />
    </SoundtrackProvider>
  );
}