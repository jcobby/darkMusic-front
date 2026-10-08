// Plain data + helpers, safe for server pages. The score hook lives in useBestScore.ts.
import type { Beat } from "./api";

/** The DMY games, in the order they appear on /games. */
export const GAMES = [
  {
    slug: "beat-tap",
    title: "Beat Tap",
    blurb: "A rhythm game built from DMY's free beats — the drums become notes. Hit them on time.",
    scoreLabel: "pts",
    better: "high",
  },
  {
    slug: "vinyl-catch",
    title: "Vinyl Catch",
    blurb: "Records drop on the beat of DMY's free beats. Catch them in your crate, grab the gold, dodge the skulls.",
    scoreLabel: "pts",
    better: "high",
  },
  {
    slug: "memory",
    title: "Memory Match",
    blurb: "Flip the cards and pair up the shots from DMY's video shoots in as few moves as you can.",
    scoreLabel: "moves",
    better: "low",
  },
  {
    slug: "name-that-cover",
    title: "Name That Cover",
    blurb: "A DMY cover slowly comes into focus. Name the song before it's fully revealed.",
    scoreLabel: "pts",
    better: "high",
  },
  {
    slug: "trivia",
    title: "DMY Trivia",
    blurb: "How well do you know Lenko Psycho and Dark Music Yard? Eight questions.",
    scoreLabel: "correct",
    better: "high",
  },
] as const;

export type GameSlug = (typeof GAMES)[number]["slug"];

export const bestKey = (slug: GameSlug) => `dmy_game_best_${slug}`;

/** Read a saved personal best (null when none, or storage is unavailable). */
export function readBest(slug: GameSlug): number | null {
  try {
    const v = localStorage.getItem(bestKey(slug));
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

/** A free beat the games can play (public MP3 on Cloudinary, CORS-enabled). */
export interface FreeBeat {
  id: string;
  title: string;
  slug: string;
  genre: string | null;
  src: string;
}

/**
 * The games request audio in CORS mode (to analyse it), while the site player
 * doesn't. Give the games their own URL so the browser never mixes the two
 * cache entries — a cached non-CORS copy can make the game's request fail.
 */
const gameAudioUrl = (url: string) => `${url}${url.includes("?") ? "&" : "?"}dmy=game`;

export const toFreeBeats = (beats: Beat[]): FreeBeat[] =>
  beats
    .filter((b) => b.streamUrl)
    .map((b) => ({ id: b.id, title: b.title, slug: b.slug, genre: b.genre, src: gameAudioUrl(b.streamUrl!) }));

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(list: readonly T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
