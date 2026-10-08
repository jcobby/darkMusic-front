"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "./AudioPlayerProvider";

/**
 * Muted, looping inline clip that reliably autoplays (React drops the `muted`
 * attribute, which blocks autoplay — so it's set on the element). With
 * `soundToggle`, viewers can unmute; that pauses the site soundtrack.
 */
export function LoopVideo({
  src,
  poster,
  label,
  className = "",
  soundToggle = false,
}: {
  src: string;
  poster: string;
  label: string;
  className?: string;
  soundToggle?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const { playing, toggle } = useAudioPlayer();

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    // Reduced-motion visitors get the still poster instead of a loop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void v.play().catch(() => {});
  }, []);

  function toggleSound() {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) {
      if (playing) toggle(); // don't talk over the site soundtrack
      void v.play().catch(() => {});
    }
  }

  return (
    <div className="relative h-full w-full">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        className={className}
      />
      {soundToggle && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80"
        >
          {muted ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="m23 9-6 6M17 9l6 6" strokeLinecap="round" />
              </svg>
              Tap for sound
            </>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
