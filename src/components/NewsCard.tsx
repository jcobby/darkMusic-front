"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/api";

const LABELS: Record<NewsItem["category"], string> = {
  news: "News",
  hiphop: "Hip-Hop",
  release: "New Release",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

/** A single external news headline. Links out to the original article. */
export function NewsCard({ item }: { item: NewsItem }) {
  const [imgOk, setImgOk] = useState(Boolean(item.image));

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="card-hover group flex flex-col overflow-hidden"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-ink-700 to-ink-800">
        {imgOk && item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            loading="lazy"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="gradient-text font-display text-2xl font-bold opacity-40">DMY</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent backdrop-blur">
          {LABELS[item.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-3 font-semibold leading-snug text-white transition-colors group-hover:text-accent">
          {item.title}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-neutral-500">
          <span className="truncate">{item.source}</span>
          {item.date && <span className="shrink-0">{timeAgo(item.date)}</span>}
        </div>
      </div>
    </a>
  );
}
