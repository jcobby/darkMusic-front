import type { Metadata } from "next";
import { getBeats, getGameMusic } from "@/lib/api";
import { toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { BeatBreaker } from "@/components/games/BeatBreaker";

export const metadata: Metadata = {
  title: "Beat Breaker · Games",
  description:
    "Smash the bricks to DMY beats and Lenko Psycho songs — break them on the kick for double points, reach level 21 to unlock an unreleased track, and top the board to win GH₵500.",
};

export default async function Page() {
  // DMY's free beats to start, then Lenko Psycho songs from level 4 and an unreleased track from level 21.
  const [beats, music] = await Promise.all([getBeats(), getGameMusic("beat-breaker")]);
  return (
    <SoundtrackProvider
      beats={toFreeBeats(beats)}
      music={
        music
          ? {
              songs: music.songs,
              songsFromLevel: music.songsFromLevel,
              unreleasedFromLevel: music.unreleasedFromLevel,
              hasUnreleased: music.hasUnreleased,
            }
          : undefined
      }
    >
      <BeatBreaker />
    </SoundtrackProvider>
  );
}
