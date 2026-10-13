"use client";

import { useCallback, useEffect, useState } from "react";
import { cdnImage } from "@/lib/cdn";

export interface BtsPhoto {
  src: string;
  alt: string;
  caption?: string | null;
  position?: string;
}

/** Photo grid; tap a photo to open it full-screen (arrow keys or the side buttons to move). */
export function BtsGallery({ photos }: { photos: BtsPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  const current = open === null ? null : photos[open];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={`${p.src}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-800"
            aria-label={`Open photo: ${p.caption || p.alt}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cdnImage(p.src, 700)}
              alt={p.alt}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] group-hover:opacity-90"
              style={{ objectPosition: p.position }}
            />
            {p.caption && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent px-3 pb-2.5 pt-8 text-left text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {p.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={close}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cdnImage(current.src, 1600)}
            alt={current.alt}
            className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-glow"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-5 px-16 text-center text-sm text-neutral-300">
            {current.caption || current.alt}
            <span className="ml-2 text-neutral-500">
              {open! + 1} / {photos.length}
            </span>
          </div>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-xl text-white transition hover:bg-accent sm:left-5"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-xl text-white transition hover:bg-accent sm:right-5"
              >
                ›
              </button>
            </>
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-accent sm:right-5 sm:top-5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
