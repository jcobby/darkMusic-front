import type { Metadata } from "next";
import { getBeats } from "@/lib/api";
import { toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { BeatBreaker } from "@/components/games/BeatBreaker";

export const metadata: Metadata = {
  title: "Beat Breaker · Games",
  description: "Smash the bricks to DMY's free beats — break them on the kick for double points.",
};

export default async function Page() {
  // DMY's free beats are the soundtrack.
  const beats = toFreeBeats(await getBeats());
  return (
    <SoundtrackProvider beats={beats}>
      <BeatBreaker />
    </SoundtrackProvider>
  );
}
