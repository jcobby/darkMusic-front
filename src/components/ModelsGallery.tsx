"use client";

import { useEffect, useState } from "react";
import { CoverArt } from "./CoverArt";
import { Reveal } from "./Reveal";
import { BookModelDialog } from "./BookModelDialog";
import type { ModelProfileItem } from "@/lib/api";
import { ghs } from "@/lib/modelsMarket";

export function ModelsGallery({ models }: { models: ModelProfileItem[] }) {
  const [selected, setSelected] = useState<ModelProfileItem | null>(null);

  // Re-open a model after sign-in (/models?book=<slug>).
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("book");
    const m = slug ? models.find((x) => x.slug === slug) : undefined;
    if (m) setSelected(m);
  }, [models]);

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
                <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/20 to-transparent" />
                {(m.photos.length > 1 || m.video) && (
                  <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-neutral-100 backdrop-blur">
                    {m.photos.length} photos{m.video ? " · video" : ""}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-display text-lg font-bold text-white">{m.name}</p>
                    {m.rating && (
                      <span className="shrink-0 text-xs font-semibold text-white">
                        <span className="text-accent">★</span> {m.rating.avg.toFixed(1)}
                        <span className="text-neutral-400"> ({m.rating.count})</span>
                      </span>
                    )}
                  </div>
                  {(m.location || m.categories.length > 0) && (
                    <p className="mt-0.5 truncate text-xs text-neutral-300">
                      {[m.location && `📍 ${m.location}`, m.categories.slice(0, 2).join(" · ")]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                      From {ghs(m.rateGhs)}
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

      {selected && (
        <BookModelDialog
          model={selected}
          onClose={() => {
            setSelected(null);
            // Drop ?book= so a refresh doesn't reopen the dialog.
            if (window.location.search.includes("book=")) window.history.replaceState({}, "", "/models");
          }}
        />
      )}
    </>
  );
}
