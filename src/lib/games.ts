// Plain data + helpers, safe for server pages. The score hook lives in useBestScore.ts.
import type { Beat, BeatOfTheDay } from "./api";
import { monthlyPrize, showNonMusicGames } from "@/config/site";

/** Every Lenko Army Fan Zone activity, in the order they appear on /games. `music: false` ones are
 *  hidden while `showNonMusicGames` is off; `listen` is what fans hear (or are tested on) in it. */
export const ALL_GAMES = [
  {
    slug: "beat-breaker",
    title: "Beat Breaker",
    blurb: `Smash the bricks on the kick for double points — Lenko Psycho songs from level 4, an unreleased track at level 21. The top fan each month receives a ${monthlyPrize} fan appreciation prize sponsored by DMY.`,
    scoreLabel: "pts",
    better: "high",
    music: true,
    listen: "🎧 Lenko Psycho songs from level 4 — and an unreleased track at level 21",
  },
  {
    slug: "pool",
    title: "DMY Pool",
    blurb: "The jukebox pool table: 1v1 8-ball (the billiards game) against the Lenko Army where every ball is a Lenko Psycho song — ranked best-of-3 matches move you up (or down) the ladder, challenge a friend with a link, or practise against the computer. DMY Pool Night: every Thursday from 7pm.",
    scoreLabel: "rating",
    better: "high",
    music: true,
    listen: "🎧 Every ball is a Lenko Psycho song — pot it and it plays; win a frame for the unreleased track",
  },
  {
    slug: "lenko-trivia",
    title: "Artist Music Trivia: Fans Test",
    blurb: "A free monthly music knowledge activity on Lenko Psycho's songs, lyrics and videos: the last day of every month at 12:00 noon, answer your question within 2 minutes. Everyone who gets it right shares a GH₵1,500 fan appreciation prize sponsored by DMY.",
    scoreLabel: "correct",
    better: "high",
    music: true,
    listen: "🎧 Questions on the songs, lyrics and videos",
  },
  {
    slug: "beat-tap",
    title: "Beat Tap",
    blurb: "A rhythm game built from DMY's free beats — the drums become notes. Hit them on time.",
    scoreLabel: "pts",
    better: "high",
    music: true,
    listen: "🎧 DMY's free beats",
  },
  {
    slug: "vinyl-catch",
    title: "Vinyl Catch",
    blurb: "Records drop on the beat of DMY's free beats. Catch them in your crate, grab the gold, dodge the skulls.",
    scoreLabel: "pts",
    better: "high",
    music: true,
    listen: "🎧 DMY's free beats",
  },
  {
    slug: "memory",
    title: "Memory Match",
    blurb: "Flip the cards and pair up the shots from DMY's video shoots in as few moves as you can.",
    scoreLabel: "moves",
    better: "low",
    music: false,
    listen: "🎧 DMY's free beats",
  },
  {
    slug: "name-that-cover",
    title: "Name That Cover",
    blurb: "A DMY cover slowly comes into focus. Name the song before it's fully revealed.",
    scoreLabel: "pts",
    better: "high",
    music: true,
    listen: "🎧 DMY's free beats, over the release covers",
  },
  {
    slug: "trivia",
    title: "DMY Trivia",
    blurb: "How well do you know Lenko Psycho and Dark Music Yard? Eight questions.",
    scoreLabel: "correct",
    better: "high",
    music: true,
    listen: "🎧 DMY's free beats while you answer",
  },
] as const;

/** The activities on show — just the music ones while `showNonMusicGames` is off. */
export const GAMES = ALL_GAMES.filter((g) => showNonMusicGames || g.music);

export type GameSlug = (typeof ALL_GAMES)[number]["slug"];

/** Whether a game's page is open (hidden ones 404). */
export const gameShown = (slug: GameSlug) => GAMES.some((g) => g.slug === slug);

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
