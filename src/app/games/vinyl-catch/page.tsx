import type { Metadata } from "next";
import { getBeatOfTheDay, getBeats } from "@/lib/api";
import { featuredBeat, toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { VinylCatch } from "@/components/games/VinylCatch";

export const metadata: Metadata = {
  title: "Vinyl Catch · Games",
  description: "Catch records that drop on the beat of DMY's free beats.",
};

export default async function Page() {
  // DMY's free beats are the soundtrack.
  const [all, botd] = await Promise.all([getBeats(), getBeatOfTheDay()]);
  const beats = toFreeBeats(all);
  return (
    <SoundtrackProvider beats={beats} featured={featuredBeat(botd)}>
      <VinylCatch />
    </SoundtrackProvider>
  );
}