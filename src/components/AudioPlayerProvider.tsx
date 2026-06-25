"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface Track {
  id: string;
  title: string;
  subtitle?: string;
  src: string;
  coverImage?: string;
  /** True for ~30–60s snippets (not the full song). */
  preview?: boolean;
  /** Where to get the full song (e.g. the release page). */
  fullHref?: string;
}

interface AudioContextValue {
  current: Track | null;
  playing: boolean;
  loading: boolean;
  error: boolean;
  currentTime: number;
  duration: number;
  isCurrent: (id: string) => boolean;
  /** Resolves when playback starts; rejects if blocked (e.g. no user gesture). */
  play: (track: Track) => Promise<void>;
  toggle: () => void;
  seek: (fraction: number) => void;
  stop: () => void;
}

const Ctx = createContext<AudioContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    const onPlay = () => {
      setPlaying(true);
      // Stop the Spotify bar so the two players never play at once.
      window.dispatchEvent(new Event("dmy:stop-spotify"));
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onError = () => {
      setError(true);
      setPlaying(false);
      setLoading(false);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
    };
  }, []);

  // When the Spotify player starts, stop and hide this MP3 player.
  useEffect(() => {
    const onStop = () => {
      audioRef.current?.pause();
      setCurrent(null);
      setPlaying(false);
    };
    window.addEventListener("dmy:stop-audio", onStop);
    return () => window.removeEventListener("dmy:stop-audio", onStop);
  }, []);

  const play = useCallback(
    (track: Track): Promise<void> => {
      const audio = audioRef.current;
      if (!audio) return Promise.resolve();
      if (current?.id === track.id) {
        if (audio.paused) return audio.play();
        audio.pause();
        return Promise.resolve();
      }
      setCurrent(track);
      setError(false);
      setLoading(true);
      setCurrentTime(0);
      setDuration(0);
      audio.src = track.src;
      const p = audio.play();
      p.catch(() => setError(true));
      return p;
    },
    [current]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, [current]);

  const seek = useCallback(
    (fraction: number) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      audio.currentTime = Math.max(0, Math.min(1, fraction)) * duration;
    },
    [duration]
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setCurrent(null);
    setPlaying(false);
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      current,
      playing,
      loading,
      error,
      currentTime,
      duration,
      isCurrent: (id: string) => current?.id === id,
      play,
      toggle,
      seek,
      stop,
    }),
    [current, playing, loading, error, currentTime, duration, play, toggle, seek, stop]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudioPlayer(): AudioContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
