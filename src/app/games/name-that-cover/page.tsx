import type { Metadata } from "next";
import { getBeatOfTheDay, getBeats } from "@/lib/api";
import { featuredBeat, toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { NameThatCover } from "@/components/games/NameThatCover";

export const metadata: Metadata = {
  title: "Name That Cover · Lenko Army Fan Zone",
  description: "Name the DMY release as its cover art comes into focus.",
};

export default async function Page() {
  // DMY's free beats are the soundtrack.
  const [all, botd] = await Promise.all([getBeats(), getBeatOfTheDay()]);
  const beats = toFreeBeats(all);
  return (
    <SoundtrackProvider beats={beats} featured={featuredBeat(botd)}>
      <NameThatCover />
    </SoundtrackProvider>
  );
}