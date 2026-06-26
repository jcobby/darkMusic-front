"use client";

import { useEffect, useState } from "react";

/**
 * Displays the artist poster (full, uncropped) on the Artist Profile page.
 * Drop the poster in as `frontend/public/artist-poster.png`. Until then it
 * shows a branded fallback so nothing looks broken.
 */
export function ArtistPoster() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = "/artist-poster.png";
  }, []);

  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-glow-sm ring-1 ring-white/5">
      {ok === true ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/artist-poster.png"
          alt="Lenko Psycho — Dark Music Yard"
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="grid h-full place-items-center bg-gradient-to-br from-ink-700 via-ink-800 to-accent-deep/25 px-6 text-center">
          <div>
            <p className="font-display text-4xl font-bold leading-none text-white sm:text-5xl">
              LENKO
              <span className="mt-1 block text-base font-semibold tracking-[0.35em] text-accent">
                PSYCHO
              </span>
            </p>
            <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-neutral-400">
              Ghana Hip Hop · Dark Music Yard
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
