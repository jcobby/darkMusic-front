import type { Metadata } from "next";
import { getBeats } from "@/lib/api";
import { toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { MemoryMatch } from "@/components/games/MemoryMatch";

export const metadata: Metadata = {
  title: "Memory Match · Games",
  description: "Pair up photos from DMY's video shoots — to a soundtrack of DMY free beats.",
};

export default async function Page() {
  // DMY's free beats are the soundtrack.
  const beats = toFreeBeats(await getBeats());
  return (
    <SoundtrackProvider beats={beats}>
      <MemoryMatch />
    </SoundtrackProvider>
  );
}