import type { Metadata } from "next";
import Link from "next/link";
import { getBeatOfTheDay, getBeats } from "@/lib/api";
import { featuredBeat, toFreeBeats } from "@/lib/games";
import { SoundtrackBar, SoundtrackProvider } from "@/components/games/Soundtrack";
import { PoolGame } from "@/components/games/pool/PoolGame";

export const metadata: Metadata = {
  title: "DMY Pool — 1v1 8-ball · Games",
  description:
    "Play 8-ball pool against the Lenko Army on Dark Music Yard: ranked best-of-3 matches move you up the ladder, Pool events pay prizes, or challenge a friend with a link.",
  alternates: { canonical: "/games/pool" },
};

export default async function Page() {
  // DMY's free beats play while you shoot (the Beat of the Day first)
  const [beats, botd] = await Promise.all([getBeats(), getBeatOfTheDay()]);
  return (
    <SoundtrackProvider beats={toFreeBeats(beats)} featured={featuredBeat(botd)}>
      <section className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 text-sm">
            <Link href="/games" className="text-neutral-400 transition hover:text-white">
              ← All games
            </Link>
          </div>
          <div className="mb-6">
            <p className="eyebrow mb-2">
              <span className="h-px w-6 bg-accent" />
              DMY Games
            </p>
            <h1 className="display-sm text-white">DMY Pool</h1>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              1v1 8-ball against the Lenko Army. Ranked best-of-3 matches move you up (or down) the ladder — or challenge a friend with a link.
            </p>
          </div>
          <SoundtrackBar />
          <PoolGame />
        </div>
      </section>
    </SoundtrackProvider>
  );
}
