import type { Metadata } from "next";
import Link from "next/link";
import { getBeatOfTheDay, getBeats, getSongClips } from "@/lib/api";
import { featuredBeat, toFreeBeats } from "@/lib/games";
import { SoundtrackBar, SoundtrackDock, SoundtrackProvider } from "@/components/games/Soundtrack";
import { PoolGame } from "@/components/games/pool/PoolGame";

export const metadata: Metadata = {
  title: "DMY Pool — 1v1 8-ball · Lenko Army Fan Zone",
  description:
    "Play 8-ball pool against the Lenko Army on Dark Music Yard: ranked best-of-3 matches move you up the ladder, Pool events pay prizes, challenge a friend with a link — or practise against the computer.",
  alternates: { canonical: "/games/pool" },
};

/** In the mix: a 45-second Lenko Psycho song clip, then this much of a DMY beat, then the next song. */
const BEAT_SECONDS = 35;

export default async function Page() {
  // Lenko Psycho songs and DMY's free beats take turns while you shoot (the Beat of the Day is the first beat)
  const [beats, botd, clips] = await Promise.all([getBeats(), getBeatOfTheDay(), getSongClips()]);
  const songs = clips?.songs.map(({ id, title, artist, src }) => ({ id, title, artist, src })) ?? [];
  return (
    <SoundtrackProvider
      beats={toFreeBeats(beats)}
      featured={featuredBeat(botd)}
      music={{ songs, songsFromLevel: 0, unreleasedFromLevel: Infinity, hasUnreleased: false }}
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
