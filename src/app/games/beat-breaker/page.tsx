import type { Metadata } from "next";
import { getBeatOfTheDay, getBeats, getGameMusic } from "@/lib/api";
import { featuredBeat, toFreeBeats } from "@/lib/games";
import { SoundtrackProvider } from "@/components/games/Soundtrack";
import { BeatBreaker } from "@/components/games/BeatBreaker";
import { monthlyPrize } from "@/config/site";

export const metadata: Metadata = {
  title: "Beat Breaker · Games",
  description: `Smash the bricks to DMY beats and Lenko Psycho songs — break them on the kick for double points, reach level 21 to unlock an unreleased track, and top the board to win ${monthlyPrize} every month. Free to play.`,
};

export default async function Page() {
  // DMY's free beats to start (the Beat of the Day first), then Lenko Psycho songs from level 4
  // and an unreleased track from level 21.
  const [beats, music, botd] = await Promise.all([getBeats(), getGameMusic("beat-breaker"), getBeatOfTheDay()]);
  return (
    <SoundtrackProvider
      beats={toFreeBeats(beats)}
      featured={featuredBeat(botd)}
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
      <BeatBreaker beatOfTheDay={botd?.beat ? { title: botd.beat.title, multiplier: botd.multiplier } : null} />
    </SoundtrackProvider>
  );
}
