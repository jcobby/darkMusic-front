"use client";

import { useState } from "react";
import { CoverArt } from "./CoverArt";

/** Main photo plus tappable thumbnails (all of an item's photos). */
export function ProductGallery({ images, alt, aspect = "aspect-square" }: { images: string[]; alt: string; aspect?: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  return (
    <div className="space-y-3">
      <div className={`card overflow-hidden ${aspect}`}>
        <CoverArt src={current} alt={`${alt} — photo ${active + 1} of ${Math.max(images.length, 1)}`} label={alt} width={1200} />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {images.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === active}
              className={`aspect-square overflow-hidden rounded-xl border-2 transition ${
                i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <CoverArt src={img} alt="" width={240} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
