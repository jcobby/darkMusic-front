"use client";

import { useState } from "react";
import { CoverArt } from "./CoverArt";
import { Reveal } from "./Reveal";
import { BookModelDialog } from "./BookModelDialog";
import type { ModelProfileItem } from "@/lib/api";

export function ModelsGallery({ models }: { models: ModelProfileItem[] }) {
  const [selected, setSelected] = useState<ModelProfileItem | null>(null);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {models.map((m, i) => (
          <Reveal key={m.id} delay={(i % 4) * 0.07}>
            <button
              type="button"
              onClick={() => setSelected(m)}
              className="card-hover group block w-full overflow-hidden text-left"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <CoverArt
                  src={m.photos[0]}
                  alt={m.name}
                  label={m.name}
                  className="transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
                {m.photos.length > 1 && (
                  <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-neutral-100 backdrop-blur">
                    {m.photos.length} photos
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-display text-lg font-bold text-white">{m.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-accent">
                      from GH₵2,000
                    </span>
                    <span className="text-xs font-semibold text-white transition-colors group-hover:text-accent">
                      Book →
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </Reveal>
        ))}
      </div>

      {selected && <BookModelDialog model={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
