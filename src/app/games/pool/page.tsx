import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBeatOfTheDay, getBeats, getGameMusic, getSongClips } from "@/lib/api";
import { featuredBeat, gameShown, toFreeBeats } from "@/lib/games";
import { SoundtrackBar, SoundtrackDock, SoundtrackProvider } from "@/components/games/Soundtrack";
import { PoolGame } from "@/components/games/pool/PoolGame";

export const metadata: Metadata = {
  title: "DMY Pool — the jukebox pool table · Lenko Army Fan Zone",
  description:
    "8-ball where every ball is a Lenko Psycho song: pot it and it plays. Win a frame to hear an unreleased track. Ranked best-of-3 matches against the Lenko Army, friend challenges, or the computer.",
  alternates: { canonical: "/games/pool" },
};

/** In the mix: a 45-second Lenko Psycho song clip, then this much of a DMY beat, then the next song. */
const BEAT_SECONDS = 35;

export default async function Page() {
  if (!gameShown("pool")) notFound(); // hidden while the fan zone sticks to the music (showNonMusicGames)
  // Lenko Psycho songs and DMY's free beats take turns while you shoot (the Beat of the Day is the first beat);
  // a potted ball puts its song on, and a frame won unlocks Beat Breaker's unreleased track
  const [beats, botd, clips, bb] = await Promise.all([getBeats(), getBeatOfTheDay(), getSongClips(), getGameMusic("beat-breaker")]);
  const songs = clips?.songs.map(({ id, title, artist, src }) => ({ id, title, artist, src })) ?? [];
  return (
    <SoundtrackProvider
      beats={toFreeBeats(beats)}
      featured={featuredBeat(botd)}
      music={{ songs, songsFromLevel: 0, unreleasedFromLevel: Infinity, hasUnreleased: Boolean(bb?.hasUnreleased) }}
      mix={{ beatSeconds: BEAT_SECONDS }}
    >
      <section className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 text-sm">
            <Link href="/games" className="text-neutral-400 transition hover:text-white">
              ← Fan Zone
            </Link>
          </div>
          <div className="mb-6">
            <p className="eyebrow mb-2">
              <span className="h-px w-6 bg-accent" />
              Lenko Army Fan Zone
            </p>
            <h1 className="display-sm text-white">DMY Pool</h1>
            <p className="mt-2 max-w-xl text-sm text-neutral-300">
              🎧 <b className="text-white">The jukebox table:</b> every ball is a Lenko Psycho song — pot it and it plays. Win a frame and you hear an
              unreleased track.
            </p>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              1v1 8-ball against the Lenko Army. Ranked best-of-3 matches move you up (or down) the ladder — or challenge a friend with a link, or play
              the computer when nobody&apos;s around. <b className="text-white">DMY Pool Night: every Thursday from 7pm.</b>
            </p>
          </div>
          <SoundtrackBar />
          <PoolGame />
        </div>
      </section>
      {/* Back in the lobby with the music on, the player stays on screen */}
      <SoundtrackDock />
    </SoundtrackProvider>
  );
}
