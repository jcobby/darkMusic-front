"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAudioPlayer } from "../AudioPlayerProvider";
import { shuffle, type FreeBeat } from "@/lib/games";

/** A Lenko Psycho song in a game's soundtrack (signed link from the API). */
export interface SoundtrackSong {
  id: string;
  title: string;
  artist: string;
  src: string;
}
/** When the songs (and the unreleased track) take over from the beats. */
export interface GameMusicPlan {
  songs: SoundtrackSong[];
  songsFromLevel: number;
  unreleasedFromLevel: number;
  hasUnreleased: boolean;
}
export type SoundtrackStage = "beats" | "songs" | "unreleased";

export interface NowPlaying {
  kind: "beat" | "song" | "unreleased";
  title: string;
  /** Genre for a beat, artist for a song */
  detail: string | null;
  /** It's the Beat of the Day (Beat Breaker scores its kicks higher). */
  featured?: boolean;
}

interface SoundtrackApi {
  /** Start (or resume) the music — call from a click/tap so browsers allow sound. */
  start: () => void;
  /** Live frequency analyser on the music (null until started / if unsupported). */
  analyser: MutableRefObject<AnalyserNode | null>;
  track: NowPlaying | null;
  playing: boolean;
  muted: boolean;
  toggleMute: () => void;
  /** Pause, or carry on from where it paused. */
  togglePlay: () => void;
  skip: () => void;
  hasMusic: boolean;
  /** Songs / unreleased track plan (empty for games that only use beats). */
  music: GameMusicPlan;
  /** Songs and beats take turns (DMY Pool) — null when the game switches between them itself. */
  mix: { beatSeconds: number } | null;
  stage: SoundtrackStage;
  /** Switch between the beats and the songs (no-op if already there). */
  setStage: (stage: "beats" | "songs") => void;
  /** Play the unlocked unreleased track on a loop. */
  playUnreleased: (track: { title: string; artist: string; src: string }) => void;
}

const NO_MUSIC: GameMusicPlan = { songs: [], songsFromLevel: Infinity, unreleasedFromLevel: Infinity, hasUnreleased: false };

/*
 * Songs come out of a "shuffle bag" saved on the player's device: every song
 * plays once, in random order, before any repeats — across games and visits —
 * and the same song never plays twice in a row. (A fresh shuffle on each page
 * load kept landing on the same few songs.)
 */
const BAG_KEY = "dmy_song_bag";
const LAST_KEY = "dmy_song_last";
/** A song cut off before this many seconds goes back to the front of the bag. */
const SONG_COUNTS_AFTER_S = 45;

function readBag(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(BAG_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeBag(bag: string[]) {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  } catch {
    /* private mode — the bag lasts for this visit only */
  }
}
/** Put a song back at the front of the bag. */
function returnToBag(id: string) {
  writeBag([id, ...readBag().filter((x) => x !== id)]);
}
/** Take the next song out of the bag, refilling it with a new shuffle when it's empty. */
function nextFromBag(songs: SoundtrackSong[]): SoundtrackSong {
  const known = new Set(songs.map((s) => s.id));
  let bag = readBag().filter((id) => known.has(id));
  if (bag.length === 0) {
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_KEY);
    } catch {
      /* ignore */
    }
    bag = shuffle(songs.map((s) => s.id));
    if (bag.length > 1 && bag[0] === last) bag.push(bag.shift()!); // no back-to-back repeat
  }
  const id = bag.shift()!;
  writeBag(bag);
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* ignore */
  }
  return songs.find((s) => s.id === id)!;
}

const Ctx = createContext<SoundtrackApi | null>(null);

/** The game soundtrack, or null when a page has none (e.g. Beat Tap runs its own audio). */
export const useSoundtrack = () => useContext(Ctx);

export type FreqBuffer = Parameters<AnalyserNode["getByteFrequencyData"]>[0];
export const newFreqBuffer = (): FreqBuffer => new Uint8Array(new ArrayBuffer(512)) as FreqBuffer;

/** Bass energy (0–255) from the analyser — kicks and 808s live in the lowest bins. */
export function bassLevel(analyser: AnalyserNode | null, buf: FreqBuffer): number {
  if (!analyser) return 0;
  analyser.getByteFrequencyData(buf);
  // fftSize 1024 → ~43 Hz per bin; bins 1–4 ≈ 43–215 Hz.
  return (buf[1] + buf[2] + buf[3] + buf[4]) / 4;
}

/**
 * Plays a game's soundtrack, routed through Web Audio so games can react to the
 * bass: DMY's free beats (shuffled, the Beat of the Day first), and — for games
 * with a music plan — Lenko Psycho songs and an unlockable unreleased track.
 * With `mix`, a song and a beat take turns: a song clip, then `beatSeconds` of a
 * beat, then the next song. Pauses the site player while it plays.
 */
export function SoundtrackProvider({
  beats,
  featured = null,
  music = NO_MUSIC,
  mix = null,
  children,
}: {
  beats: FreeBeat[];
  /** The Beat of the Day — it opens the beats. */
  featured?: FreeBeat | null;
  music?: GameMusicPlan;
  mix?: { beatSeconds: number } | null;
  children: ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const beatOrder = useRef<FreeBeat[]>([]);
  const beatIdx = useRef(-1);
  const featuredId = useRef<string | null>(featured?.id ?? null);
  featuredId.current = featured?.id ?? null;
  const songsRef = useRef(music.songs);
  songsRef.current = music.songs;
  const currentSong = useRef<string | null>(null); // id of the song loaded right now
  const lastKind = useRef<NowPlaying["kind"] | null>(null); // what's loaded now (in a mix, the next one is the other kind)
  const mixRef = useRef(mix);
  mixRef.current = mix;
  const stageRef = useRef<SoundtrackStage>("beats");
  const unreleased = useRef<{ title: string; artist: string; src: string } | null>(null);
  const failures = useRef(0); // consecutive tracks that wouldn't load
  const [track, setTrack] = useState<NowPlaying | null>(null);
  const [stage, setStageState] = useState<SoundtrackStage>("beats");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const site = useAudioPlayer();
  const siteRef = useRef(site);
  siteRef.current = site;

  /**
   * A song is being left (the stage changed or a new game began). If it had
   * barely started, put it back at the front of the queue so it still gets its
   * turn — a song cut off after a few seconds doesn't count as heard.
   */
  const leaveSong = useCallback(() => {
    const id = currentSong.current;
    const audio = audioRef.current;
    if (id && audio && audio.currentTime < SONG_COUNTS_AFTER_S) returnToBag(id);
    currentSong.current = null;
  }, []);

  /** Play the next track for the current stage (songs fall back to beats if there are none; in a mix they take turns). */
  const playNext = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let stageNow = stageRef.current;
    if (stageNow === "songs" && songsRef.current.length === 0) stageNow = "beats";
    const haveSongs = songsRef.current.length > 0;
    const haveBeats = beatOrder.current.length > 0;
    // In a mix: a song after a beat (or to open), a beat after a song — whichever there is if one kind is missing
    const mixSong = mixRef.current !== null && stageNow === "beats" && haveSongs && (lastKind.current !== "song" || !haveBeats);
    if (stageNow === "unreleased" && unreleased.current) {
      const u = unreleased.current;
      currentSong.current = null;
      audio.loop = true; // keep the reward playing
      audio.src = u.src;
      lastKind.current = "unreleased";
      setTrack({ kind: "unreleased", title: u.title, detail: u.artist });
    } else if (stageNow === "songs" || mixSong) {
      const s = nextFromBag(songsRef.current);
      currentSong.current = s.id;
      audio.loop = false;
      audio.src = s.src;
      lastKind.current = "song";
      setTrack({ kind: "song", title: s.title, detail: s.artist });
    } else {
      currentSong.current = null;
      if (!haveBeats) return;
      beatIdx.current = (beatIdx.current + 1) % beatOrder.current.length;
      const b = beatOrder.current[beatIdx.current];
      audio.loop = false;
      audio.src = b.src;
      lastKind.current = "beat";
      setTrack({ kind: "beat", title: b.title, detail: b.genre, featured: b.id === featuredId.current });
    }
    void audio.play().catch(() => setPlaying(false));
  }, []);

  const start = useCallback(() => {
    if (beats.length === 0 && music.songs.length === 0) return;
    // Don't talk over the site soundtrack or the Spotify bar — and close the site's player, so it
    // doesn't sit paused at the bottom of the screen under the game's own (SoundtrackDock).
    if (siteRef.current.current) siteRef.current.stop();
    window.dispatchEvent(new Event("dmy:stop-spotify"));

    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous"; // Cloudinary + our API allow it — needed to analyse the audio
      audio.preload = "auto";
      audio.addEventListener("play", () => setPlaying(true));
      audio.addEventListener("playing", () => (failures.current = 0));
      audio.addEventListener("pause", () => setPlaying(false));
      audio.addEventListener("ended", () => {
        currentSong.current = null; // heard in full
        playNext();
      });
      // In a mix, a beat plays for `beatSeconds`, then the next song comes in
      audio.addEventListener("timeupdate", () => {
        const m = mixRef.current;
        if (m && lastKind.current === "beat" && stageRef.current === "beats" && songsRef.current.length > 0 && audio.currentTime >= m.beatSeconds) playNext();
      });
      // A track that won't load → try the next, but give up after a full lap.
      // If the unreleased track fails, carry on with the songs.
      audio.addEventListener("error", () => {
        if (stageRef.current === "unreleased") {
          stageRef.current = "songs";
          setStageState("songs");
          playNext();
          return;
        }
        currentSong.current = null;
        const lap = stageRef.current === "songs" ? songsRef.current.length : beatOrder.current.length;
        if (++failures.current < lap) playNext();
        else setPlaying(false);
      });
      audioRef.current = audio;
      // The Beat of the Day first, then the rest shuffled
      const daily = featured && beats.find((b) => b.id === featured.id) ? featured : null;
      beatOrder.current = daily ? [daily, ...shuffle(beats.filter((b) => b.id !== daily.id))] : shuffle(beats);
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        const src = ctx.createMediaElementSource(audio);
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        an.smoothingTimeConstant = 0.5;
        const gain = ctx.createGain();
        gain.gain.value = 0.85;
        src.connect(an); // analyse before the volume, so muting doesn't stop the beat-sync
        an.connect(gain);
        gain.connect(ctx.destination);
        ctxRef.current = ctx;
        gainRef.current = gain;
        analyser.current = an;
      } catch {
        /* no Web Audio — plain playback, games fall back to timers */
      }
      playNext();
    } else if (audioRef.current.paused) {
      void audioRef.current.play().catch(() => {});
    }
    void ctxRef.current?.resume();
  }, [beats, featured, music.songs, playNext]);

  const setStage = useCallback(
    (next: "beats" | "songs") => {
      if (stageRef.current === next) return;
      leaveSong();
      stageRef.current = next;
      setStageState(next);
      failures.current = 0;
      if (audioRef.current) playNext(); // already playing → switch now
    },
    [playNext, leaveSong]
  );

  const playUnreleased = useCallback(
    (u: { title: string; artist: string; src: string }) => {
      leaveSong();
      unreleased.current = u;
      stageRef.current = "unreleased";
      setStageState("unreleased");
      if (audioRef.current) playNext();
      else start();
    },
    [playNext, start, leaveSong]
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (gainRef.current) gainRef.current.gain.value = next ? 0 : 0.85;
      else if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  const skip = useCallback(() => {
    if (!audioRef.current) start();
    else if (stageRef.current !== "unreleased") {
      currentSong.current = null; // skipped on purpose — don't bring it back
      playNext();
    }
  }, [start, playNext]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
    else start(); // carries on where it paused
  }, [start]);

  // Pause with the tab hidden; stop for good when leaving the page.
  useEffect(() => {
    const onVis = () => {
      const a = audioRef.current;
      if (!a) return;
      if (document.hidden) a.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      audioRef.current?.pause();
      void ctxRef.current?.close();
    };
  }, []);

  const value = useMemo<SoundtrackApi>(
    () => ({
      start,
      analyser,
      track,
      playing,
      muted,
      toggleMute,
      togglePlay,
      skip,
      hasMusic: beats.length > 0 || music.songs.length > 0,
      music,
      mix,
      stage,
      setStage,
      playUnreleased,
    }),
    [start, track, playing, muted, toggleMute, togglePlay, skip, beats.length, music, mix, stage, setStage, playUnreleased]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** "Now playing" strip shown above each game. */
export function SoundtrackBar() {
  const s = useSoundtrack();
  if (!s || !s.hasMusic) return null;
  const t = s.track;
  const secret = t?.kind === "unreleased";
  const plan = s.music;

  return (
    <div
      className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-2.5 text-sm transition-colors ${
        secret ? "border-yellow-400/70 bg-yellow-400/[0.08] shadow-[0_0_24px_rgba(250,204,21,0.18)]" : "border-accent/25 bg-accent/[0.07]"
      }`}
    >
      {/* Static equaliser — an animated one restyles the page every frame, under the game */}
      <span className="flex h-4 items-end gap-0.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-0.5 rounded-full ${secret ? "bg-yellow-400" : "bg-accent"}`}
            style={{ height: s.playing && !s.muted ? `${6 + ((i * 5) % 10)}px` : "4px" }}
          />
        ))}
      </span>
      {t ? (
        // At least ~12rem for the title: on a phone the buttons drop to the next line rather than squeezing it to "N…"
        <span className="min-w-[12rem] flex-1 truncate text-neutral-300">
          {secret ? (
            <span className="mr-1.5 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">
              🔒 Unreleased
            </span>
          ) : t.featured ? (
            <span className="mr-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              🎧 Beat of the Day
            </span>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Now playing </span>
          )}
          <span className="font-semibold text-white">{t.title}</span>
          {t.kind === "beat" && t.detail && <span className="text-neutral-500"> · {t.detail} free beat</span>}
          {t.kind === "song" && t.detail && <span className="text-neutral-500"> · {t.detail}</span>}
          {secret && <span className="text-neutral-400"> · not out anywhere yet</span>}
        </span>
      ) : (
        <span className="min-w-0 flex-1 text-neutral-300">
          {s.mix && plan.songs.length > 0 ? (
            <span className="font-semibold text-white">Lenko Psycho songs + DMY beats</span>
          ) : (
            <span className="font-semibold text-white">DMY beats</span>
          )}
          {plan.songs.length > 0 && !s.mix && (
            <>
              {" "}
              · <span className="font-semibold text-white">Lenko songs</span> from level {plan.songsFromLevel}
            </>
          )}
          {plan.hasUnreleased && <> · 🔒 unreleased at {plan.unreleasedFromLevel}</>}
          {/* Not a button: the music starts with the game, and a red "play" here
              was being mistaken for the game's own Play button. */}
          <span className="mt-0.5 block text-xs text-neutral-500">🎵 Music starts when you play</span>
        </span>
      )}
      <span className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
        {t ? (
          <>
            {/* Just the symbol on a phone, so the row stays on one line */}
            <button type="button" onClick={s.togglePlay} className="rounded-full px-2.5 py-1 text-xs font-semibold text-neutral-200 transition hover:bg-white/10" aria-label={s.playing ? "Pause music" : "Play music"}>
              {s.playing ? "⏸" : "▶"}
              <span className="hidden sm:inline"> {s.playing ? "Pause" : "Play"}</span>
            </button>
            <button type="button" onClick={s.toggleMute} className="rounded-full px-2.5 py-1 text-xs font-semibold text-neutral-200 transition hover:bg-white/10" aria-label={s.muted ? "Unmute music" : "Mute music"}>
              {s.muted ? "🔇 Unmute" : "🔊 Mute"}
            </button>
            {!secret && (
              <button type="button" onClick={s.skip} className="rounded-full px-2.5 py-1 text-xs font-semibold text-neutral-200 transition hover:bg-white/10">
                {t.kind === "song" ? "⏭ Next song" : "⏭ Next beat"}
              </button>
            )}
            {t.kind === "beat" && (
              <Link href="/free-beats" className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white transition hover:bg-accent-soft">
                Get it free
              </Link>
            )}
            {t.kind === "song" && (
              <Link href="/music" className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white transition hover:bg-accent-soft">
                Stream it
              </Link>
            )}
          </>
        ) : null}
      </span>
    </div>
  );
}

const DOCK_BUTTON = "grid h-10 w-10 shrink-0 place-items-center rounded-full text-neutral-300 transition hover:bg-white/5 hover:text-white";

/**
 * The soundtrack as a player at the bottom of the screen, like the site's own — on a long
 * page you come back to with the music still on (DMY Pool's lobby), it's always in reach.
 * Hidden while a game is in play (`html[data-game-running]`); closing it stops the music,
 * and it's back when the music is.
 */
export function SoundtrackDock() {
  const s = useSoundtrack();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [inPlay, setInPlay] = useState(false);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    // Straight on the body, level with the site's player (the page's column is its own layer)
    setHost(document.body);
    const el = document.documentElement;
    const read = () => setInPlay(el.hasAttribute("data-game-running"));
    read();
    const watch = new MutationObserver(read);
    watch.observe(el, { attributes: true, attributeFilter: ["data-game-running"] });
    return () => watch.disconnect();
  }, []);
  const playing = s?.playing ?? false;
  useEffect(() => {
    if (playing) setClosed(false);
  }, [playing]);
  const show = Boolean(host && s?.track) && !closed && !inPlay;
  // The Creator Spotlight pop-up moves up over it (globals.css)
  useEffect(() => {
    if (!show) return;
    const el = document.documentElement;
    el.setAttribute("data-music-dock", "");
    return () => el.removeAttribute("data-music-dock");
  }, [show]);
  if (!show || !s?.track || !host) return null;

  const t = s.track;
  const secret = t.kind === "unreleased";
  const detail = secret ? "🔒 Unreleased · not out anywhere yet" : t.kind === "beat" ? `${t.detail ?? "DMY"} free beat${t.featured ? " · Beat of the Day" : ""}` : (t.detail ?? "Lenko Psycho");
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5" role="region" aria-label="Game music">
      <div className={`glass mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border p-2.5 shadow-card sm:gap-3 sm:p-3 ${secret ? "border-yellow-400/60" : "border-accent/30"}`}>
        <button
          type="button"
          onClick={s.togglePlay}
          aria-label={s.playing ? "Pause music" : "Play music"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white shadow-glow-sm transition-transform hover:scale-105"
        >
          {s.playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-3.5 shrink-0 items-end gap-0.5" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`w-0.5 rounded-full ${secret ? "bg-yellow-400" : "bg-accent"}`} style={{ height: s.playing && !s.muted ? `${5 + ((i * 4) % 9)}px` : "3px" }} />
              ))}
            </span>
            <span className="truncate">{t.title}</span>
          </p>
          <p className="truncate text-[11px] text-neutral-400">
            <span className="text-neutral-500">{s.muted ? "Muted · " : s.playing ? "Now playing · " : "Paused · "}</span>
            {detail}
          </p>
        </div>
        {!secret && (
          <button type="button" onClick={s.skip} aria-label={t.kind === "song" ? "Next song" : "Next beat"} title={t.kind === "song" ? "Next song" : "Next beat"} className={DOCK_BUTTON}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 5l9 7-9 7zM16 5h2.5v14H16z" />
            </svg>
          </button>
        )}
        <button type="button" onClick={s.toggleMute} aria-label={s.muted ? "Unmute music" : "Mute music"} title={s.muted ? "Unmute" : "Mute"} className={DOCK_BUTTON}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
            {s.muted ? <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" /> : <path d="M16 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12" />}
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            if (s.playing) s.togglePlay();
            setClosed(true);
          }}
          aria-label="Stop the music and close the player"
          title="Stop and close"
          className={DOCK_BUTTON}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>,
    host
  );
}
