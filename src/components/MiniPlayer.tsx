"use client";

import Link from "next/link";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { CoverArt } from "./CoverArt";

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Sticky bottom now-playing bar shown whenever a track is loaded. */
export function MiniPlayer() {
  const { current, playing, loading, error, currentTime, duration, toggle, seek, stop } =
    useAudioPlayer();

  if (!current) return null;
  const progress = duration ? currentTime / duration : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-fade-up px-3 pb-3 sm:px-5">
      <div className="glass mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-white/10 p-2.5 shadow-card sm:gap-4 sm:p-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg sm:h-12 sm:w-12">
          <CoverArt src={current.coverImage} alt={current.title} label={current.title} />
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-ink shadow-glow-sm transition-transform hover:scale-105"
        >
          {loading ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : playing ? (
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
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
              {current.preview && (
                <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                  Preview
                </span>
              )}
              <span className="truncate">{current.title}</span>
            </p>
            <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
              {error ? "unavailable" : `${fmt(currentTime)} / ${fmt(duration)}`}
            </span>
          </div>
          <p className="truncate text-[11px] text-neutral-400">
            {current.preview ? (
              current.fullHref ? (
                <>
                  <span className="text-neutral-500">Snippet only — </span>
                  <Link href={current.fullHref} className="font-semibold text-accent hover:underline">
                    get the full song →
                  </Link>
                </>
              ) : (
                <span className="text-neutral-500">
                  Snippet only — buy the MP3 below for the full song
                </span>
              )
            ) : (
              <span className="text-neutral-500">{current.subtitle ?? "Now playing"}</span>
            )}
          </p>
          {/* Seek bar */}
          <button
            type="button"
            aria-label="Seek"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek((e.clientX - rect.left) / rect.width);
            }}
            className="group mt-1.5 block h-2 w-full"
          >
            <span className="block h-1 w-full overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-accent to-glow-cyan transition-[width]"
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={stop}
          aria-label="Close player"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
