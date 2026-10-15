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
  skip: () => void;
  hasMusic: boolean;
  /** Songs / unreleased track plan (empty for games that only use beats). */
  music: GameMusicPlan;
  stage: SoundtrackStage;
  /** Switch between the beats and the songs (no-op if already there). */
  setStage: (stage: "beats" | "songs") => void;
  /** Play the unlocked unreleased track on a loop. */
  playUnreleased: (track: { title: string; artist: string; src: string }) => void;
}

const NO_MUSIC: GameMusicPlan = { songs: [], songsFromLevel: Infinity, unreleasedFromLevel: Infinity, hasUnreleased: false };

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
 * bass: DMY's free beats (shuffled), and — for games with a music plan — Lenko
 * Psycho songs and an unlockable unreleased track. Pauses the site player while it plays.
 */
export function SoundtrackProvider({
  beats,
  music = NO_MUSIC,
  children,
}: {
  beats: FreeBeat[];
  music?: GameMusicPlan;
  children: ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const beatOrder = useRef<FreeBeat[]>([]);
  const songOrder = useRef<SoundtrackSong[]>([]);
  const beatIdx = useRef(-1);
  const songIdx = useRef(-1);
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

  /** Play the next track for the current stage (songs fall back to beats if there are none). */
  const playNext = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let stageNow = stageRef.current;
    if (stageNow === "songs" && songOrder.current.length === 0) stageNow = "beats";
    if (stageNow === "unreleased" && unreleased.current) {
      const u = unreleased.current;
      audio.loop = true; // keep the reward playing
      audio.src = u.src;
      setTrack({ kind: "unreleased", title: u.title, detail: u.artist });
    } else if (stageNow === "songs") {
      songIdx.current = (songIdx.current + 1) % songOrder.current.length;
      const s = songOrder.current[songIdx.current];
      audio.loop = false;
      audio.src = s.src;
      setTrack({ kind: "song", title: s.title, detail: s.artist });
    } else {
      if (beatOrder.current.length === 0) return;
      beatIdx.current = (beatIdx.current + 1) % beatOrder.current.length;
      const b = beatOrder.current[beatIdx.current];
      audio.loop = false;
      audio.src = b.src;
      setTrack({ kind: "beat", title: b.title, detail: b.genre });
    }
    void audio.play().catch(() => setPlaying(false));
  }, []);

  const start = useCallback(() => {
    if (beats.length === 0 && music.songs.length === 0) return;
    // Don't talk over the site soundtrack or the Spotify bar.
    if (siteRef.current.playing) siteRef.current.toggle();
    window.dispatchEvent(new Event("dmy:stop-spotify"));

    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous"; // Cloudinary + our API allow it — needed to analyse the audio
      audio.preload = "auto";
      audio.addEventListener("play", () => setPlaying(true));
      audio.addEventListener("playing", () => (failures.current = 0));
      audio.addEventListener("pause", () => setPlaying(false));
      audio.addEventListener("ended", () => playNext());
      // A track that won't load → try the next, but give up after a full lap.
      // If the unreleased track fails, carry on with the songs.
      audio.addEventListener("error", () => {
        if (stageRef.current === "unreleased") {
          stageRef.current = "songs";
          setStageState("songs");
          playNext();
          return;
        }
        const lap = stageRef.current === "songs" ? songOrder.current.length : beatOrder.current.length;
        if (++failures.current < lap) playNext();
        else setPlaying(false);
      });
      audioRef.current = audio;
      beatOrder.current = shuffle(beats);
      songOrder.current = shuffle(music.songs);
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
  }, [beats, music.songs, playNext]);

  const setStage = useCallback(
    (next: "beats" | "songs") => {
      if (stageRef.current === next) return;
      stageRef.current = next;
      setStageState(next);
      failures.current = 0;
      if (audioRef.current) playNext(); // already playing → switch now
    },
    [playNext]
  );

  const playUnreleased = useCallback(
    (u: { title: string; artist: string; src: string }) => {
      unreleased.current = u;
      stageRef.current = "unreleased";
      setStageState("unreleased");
      if (audioRef.current) playNext();
      else start();
    },
    [playNext, start]
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
    else if (stageRef.current !== "unreleased") playNext();
  }, [start, playNext]);

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
      skip,
      hasMusic: beats.length > 0 || music.songs.length > 0,
      music,
      stage,
      setStage,
      playUnreleased,
    }),
    [start, track, playing, muted, toggleMute, skip, beats.length, music, stage, setStage, playUnreleased]
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
        <span className="min-w-0 flex-1 truncate text-neutral-300">
          {secret ? (
            <span className="mr-1.5 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">
              🔒 Unreleased
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
          Play to <span className="font-semibold text-white">DMY free beats</span>
          {plan.songs.length > 0 && (
            <>
              {" "}
              · <span className="font-semibold text-white">Lenko Psycho songs</span> from level {plan.songsFromLevel}
            </>
          )}
          {plan.hasUnreleased && <> · 🔒 an unreleased track at level {plan.unreleasedFromLevel}</>}
        </span>
      )}
      <span className="flex items-center gap-1.5">
        {t ? (
          <>
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
        ) : (
          <button type="button" onClick={s.start} className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white transition hover:bg-accent-soft">
            ▶ Play music
          </button>
        )}
      </span>
    </div>
  );
}
