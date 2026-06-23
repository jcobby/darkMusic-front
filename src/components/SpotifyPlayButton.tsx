"use client";

import { useSpotifyPlayer } from "./SpotifyPlayer";
import { spotifyEmbed } from "@/lib/spotify";

/**
 * Circular play button that plays a track from Spotify (in the bottom bar) —
 * the same playback the Spotify embed gives: 30s preview for logged-out
 * listeners, full song for Spotify users.
 */
export function SpotifyPlayButton({
  url,
  className = "",
}: {
  url: string;
  className?: string;
}) {
  const { play, activeId } = useSpotifyPlayer();
  const id = spotifyEmbed(url)?.id ?? null;
  const active = id !== null && id === activeId;

  return (
    <button
      type="button"
      aria-label="Play on Spotify"
      title="Play from Spotify"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        play(url);
      }}
      className={`grid place-items-center rounded-full bg-accent text-ink shadow-glow-sm transition-transform hover:scale-110 ${className}`}
    >
      {active ? (
        // "now playing" indicator
        <span className="flex items-center gap-[2px]">
          <span className="h-2.5 w-[3px] animate-pulse rounded-full bg-ink [animation-delay:-0.2s]" />
          <span className="h-3.5 w-[3px] animate-pulse rounded-full bg-ink" />
          <span className="h-2 w-[3px] animate-pulse rounded-full bg-ink [animation-delay:-0.4s]" />
        </span>
      ) : (
        <svg width="50%" height="50%" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
