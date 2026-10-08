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

interface SoundtrackApi {
  /** Start (or resume) the music — call from a click/tap so browsers allow sound. */
  start: () => void;
  /** Live frequency analyser on the music (null until started / if unsupported). */
  analyser: MutableRefObject<AnalyserNode | null>;
  track: FreeBeat | null;
  playing: boolean;
  muted: boolean;
  toggleMute: () => void;
  skip: () => void;
  hasMusic: boolean;
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
 * Plays DMY's free beats (shuffled) behind a game, routed through Web Audio so
 * games can react to the bass. Pauses the site player while it plays.
 */
export function SoundtrackProvider({ beats, children }: { beats: FreeBeat[]; children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const order = useRef<FreeBeat[]>([]);
  const index = useRef(0);
  const failures = useRef(0); // consecutive tracks that wouldn't load
  const [track, setTrack] = useState<FreeBeat | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const site = useAudioPlayer();
  const siteRef = useRef(site);
  siteRef.current = site;

  const playIndex = useCallback((i: number) => {
    const audio = audioRef.current;
    if (!audio || order.current.length === 0) return;
    index.current = i % order.current.length;
    const beat = order.current[index.current];
    audio.src = beat.src;
    setTrack(beat);
    void audio.play().catch(() => setPlaying(false));
  }, []);

  const start = useCallback(() => {
    if (beats.length === 0) return;
    // Don't talk over the site soundtrack or the Spotify bar.
    if (siteRef.current.playing) siteRef.current.toggle();
    window.dispatchEvent(new Event("dmy:stop-spotify"));

    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous"; // Cloudinary allows it — needed to analyse the audio
      audio.preload = "auto";
      audio.addEventListener("play", () => setPlaying(true));
      audio.addEventListener("playing", () => (failures.current = 0));
      audio.addEventListener("pause", () => setPlaying(false));
      audio.addEventListener("ended", () => playIndex(index.current + 1));
      // A beat that won't load → try the next, but give up after a full lap.
      audio.addEventListener("error", () => {
        if (++failures.current < order.current.length) playIndex(index.current + 1);
        else setPlaying(false);
      });
      audioRef.current = audio;
      order.current = shuffle(beats);
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
      playIndex(0);
    } else if (audioRef.current.paused) {
      void audioRef.current.play().catch(() => {});
    }
    void ctxRef.current?.resume();
  }, [beats, playIndex]);

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
    else playIndex(index.current + 1);
  }, [start, playIndex]);

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
    () => ({ start, analyser, track, playing, muted, toggleMute, skip, hasMusic: beats.length > 0 }),
    [start, track, playing, muted, toggleMute, skip, beats.length]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** "Now playing" strip shown above each game. */
export function SoundtrackBar() {
  const s = useSoundtrack();
  if (!s || !s.hasMusic) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-accent/25 bg-accent/[0.07] px-4 py-2.5 text-sm">
      <span className="flex h-4 items-end gap-0.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-0.5 rounded-full bg-accent ${s.playing && !s.muted ? "animate-pulse" : ""}`}
            style={{ height: s.playing && !s.muted ? `${6 + ((i * 5) % 10)}px` : "4px", animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
      {s.track ? (
        <span className="min-w-0 flex-1 truncate text-neutral-300">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Now playing</span>{" "}
          <span className="font-semibold text-white">{s.track.title}</span>
          {s.track.genre && <span className="text-neutral-500"> · {s.track.genre} free beat</span>}
        </span>
      ) : (
        <span className="min-w-0 flex-1 text-neutral-300">
          Play to a soundtrack of <span className="font-semibold text-white">DMY free beats</span>
        </span>
      )}
      <span className="flex items-center gap-1.5">
        {s.track ? (
          <>
            <button type="button" onClick={s.toggleMute} className="rounded-full px-2.5 py-1 text-xs font-semibold text-neutral-200 transition hover:bg-white/10" aria-label={s.muted ? "Unmute music" : "Mute music"}>
              {s.muted ? "🔇 Unmute" : "🔊 Mute"}
            </button>
            <button type="button" onClick={s.skip} className="rounded-full px-2.5 py-1 text-xs font-semibold text-neutral-200 transition hover:bg-white/10">
              ⏭ Next beat
            </button>
            <Link href="/free-beats" className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white transition hover:bg-accent-soft">
              Get it free
            </Link>
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
