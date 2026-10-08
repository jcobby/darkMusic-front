import type { Metadata } from "next";
import { getBeats } from "@/lib/api";
import { toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { NameThatCover } from "@/components/games/NameThatCover";

export const metadata: Metadata = {
  title: "Name That Cover · Games",
  description: "Name the DMY release as its cover art comes into focus.",
};

export default async function Page() {
  // DMY's free beats are the soundtrack.
  const beats = toFreeBeats(await getBeats());
  return (
    <SoundtrackProvider beats={beats}>
      <NameThatCover />
    </SoundtrackProvider>
  );
}