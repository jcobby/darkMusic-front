// Plain data + helpers, safe for server pages. The score hook lives in useBestScore.ts.
import type { Beat, BeatOfTheDay } from "./api";
import { monthlyPrize } from "@/config/site";

/** The Lenko Army Fan Zone activities, in the order they appear on /games. */
export const GAMES = [
  {
    slug: "beat-breaker",
    title: "Beat Breaker",
    blurb: `Smash the bricks on the kick for double points — Lenko Psycho songs from level 4, an unreleased track at level 21. The top fan each month receives a ${monthlyPrize} fan appreciation prize sponsored by DMY.`,
    scoreLabel: "pts",
    better: "high",
  },
  {
    slug: "pool",
    title: "DMY Pool",
    blurb: "1v1 8-ball (the billiards game) against the Lenko Army, to DMY's music — ranked best-of-3 matches move you up (or down) the ladder, challenge a friend with a link, or practise against the computer. DMY Pool Night: every Thursday from 7pm.",
    scoreLabel: "rating",
    better: "high",
  },
  {
    slug: "lenko-trivia",
    title: "Lenko Army Music Trivia",
    blurb: "A free monthly music knowledge activity on Lenko Psycho's songs, lyrics and videos: the last day of every month at 12:00 noon, answer your question within 2 minutes. Everyone who gets it right shares a GH₵1,500 fan appreciation prize sponsored by DMY.",
    scoreLabel: "correct",
    better: "high",
  },
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

/** The Beat of the Day as a game soundtrack beat (it plays first). */
export const featuredBeat = (botd: BeatOfTheDay | null): FreeBeat | null => (botd?.beat ? (toFreeBeats([botd.beat])[0] ?? null) : null);

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(list: readonly T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
