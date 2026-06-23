"use client";

import { useAudioPlayer, type Track } from "./AudioPlayerProvider";

function PlayIcon() {
  return (
    <svg width="50%" height="50%" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="42%" height="42%" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg width="50%" height="50%" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Circular play/pause button that drives the global mini-player. */
export function PlayButton({
  track,
  className = "",
}: {
  track: Track;
  className?: string;
}) {
  const { play, isCurrent, playing, loading } = useAudioPlayer();
  const active = isCurrent(track.id);

  return (
    <button
      type="button"
      aria-label={active && playing ? "Pause" : "Play"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        play(track);
      }}
      className={`grid place-items-center rounded-full bg-accent text-ink shadow-glow-sm transition-transform hover:scale-110 ${className}`}
    >
      {active && loading ? <Spinner /> : active && playing ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
}
