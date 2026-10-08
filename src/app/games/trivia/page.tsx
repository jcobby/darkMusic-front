import type { Metadata } from "next";
import { getBeats } from "@/lib/api";
import { toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { Trivia } from "@/components/games/Trivia";

export const metadata: Metadata = {
  title: "DMY Trivia · Games",
  description: "How well do you know Lenko Psycho and Dark Music Yard?",
};

export default async function Page() {
  // DMY's free beats are the soundtrack.
  const beats = toFreeBeats(await getBeats());
  return (
    <SoundtrackProvider beats={beats}>
      <Trivia />
    </SoundtrackProvider>
  );
}