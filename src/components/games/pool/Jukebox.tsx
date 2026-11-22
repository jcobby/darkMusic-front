"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSoundtrack, type SoundtrackSong } from "../Soundtrack";
import { MiniBall } from "./PoolStage";

/*
 * DMY Pool's jukebox — the table plays Lenko Psycho's music:
 *  - every ball colour is one of his songs (the 3 and the 11 share one, and so on): pot a ball
 *    and its song comes on (or is up next, if a song only just started);
 *  - win a frame and the unreleased track plays, once through, before anywhere else has it.
 */

/** Which song a ball plays: by colour, round the song list. Null for the cue ball and the 8. */
export function songForBall(id: number, songs: readonly SoundtrackSong[]): SoundtrackSong | null {
  if (id <= 0 || id === 8 || id > 15 || songs.length === 0) return null;
  const colour = id > 8 ? id - 8 : id; // 1–7
  return songs[(colour - 1) % songs.length];
}

type Unlocked = { title: string; artist: string; src: string };

export function usePoolJukebox() {
  const s = useSoundtrack();
  const songs = s?.music.songs ?? [];
  const songsRef = useRef(songs);
  songsRef.current = songs;
  const sRef = useRef(s);
  sRef.current = s;
  const [note, setNote] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<string | null>(null); // the unreleased track's title, once heard
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const flash = useCallback((text: string, ms = 5000) => {
    setNote(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(null), ms);
  }, []);

  const songTitle = useCallback((id: number) => songForBall(id, songsRef.current)?.title ?? null, []);

  /** A ball dropped: put its song on. */
  const onPot = useCallback(
    (id: number) => {
      const song = songForBall(id, songsRef.current);
      const st = sRef.current;
      if (!song || !st) return;
      const r = st.playSong(song.id);
      if (r === "now") flash(`🎵 The ${id} ball: “${song.title}” is on`);
      else if (r === "next") flash(`🎵 The ${id} ball: “${song.title}” is up next`);
    },
    [flash]
  );

  /** A frame won: unlock the unreleased track (through `get`, which asks the server) and play it once. */
  const unlock = useCallback(
    async (get: () => Promise<Unlocked>) => {
      if (busy.current || !sRef.current?.music.hasUnreleased) return;
      busy.current = true;
      try {
        const u = await get();
        sRef.current?.playUnreleased(u, { once: true });
        setUnlocked(u.title);
        flash(`🔓 Unreleased: “${u.title}” — not out anywhere yet. Enjoy it, you won the frame`, 9000);
      } catch (err) {
        flash(err instanceof Error ? `🔒 ${err.message}` : "🔒 Couldn't unlock the unreleased track", 6000);
      } finally {
        busy.current = false;
      }
    },
    [flash]
  );

  return { note, onPot, unlock, unlocked, songTitle, hasUnreleased: Boolean(s?.music.hasUnreleased) };
}

/** The lobby's key to the jukebox: each colour's song, and what the 8 unlocks. */
export function JukeboxKey() {
  const s = useSoundtrack();
  const songs = s?.music.songs ?? [];
  if (songs.length === 0) return null;
  const rows = [1, 2, 3, 4, 5, 6, 7].map((c) => ({ c, song: songForBall(c, songs)! }));
  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-accent/25 to-transparent p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">🎧 The jukebox table</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">Every ball is a Lenko Psycho song</h2>
        <p className="mt-1 text-sm text-neutral-300">
          Pot a ball and its song comes on — so the music follows the frame. Your opponent&apos;s pots play too.
          {s?.music.hasUnreleased && (
            <>
              {" "}
              <b className="text-yellow-300">Win a frame and you hear an unreleased track</b> that isn&apos;t out anywhere yet.
            </>
          )}
        </p>
      </div>
      <ul className="grid gap-x-4 gap-y-2 border-t border-white/[0.06] p-5 text-sm sm:grid-cols-2">
        {rows.map(({ c, song }) => (
          <li key={c} className="flex items-center gap-2">
            <MiniBall id={c} size={18} />
            <MiniBall id={c + 8} size={18} />
            <span className="min-w-0 truncate text-neutral-200">{song.title}</span>
          </li>
        ))}
        {s?.music.hasUnreleased && (
          <li className="flex items-center gap-2">
            <MiniBall id={8} size={18} />
            <span className="min-w-0 truncate font-semibold text-yellow-300">🔒 Win the frame: the unreleased track</span>
          </li>
        )}
      </ul>
    </div>
  );
}
