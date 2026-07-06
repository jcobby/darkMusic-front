"use client";

import { useEffect, useState } from "react";
import { getNews, type NewsItem } from "@/lib/api";
import { NewsCard } from "./NewsCard";

/** Home-page strip: a few of the freshest headlines, one from each bucket. */
export function NewsTeaser() {
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    getNews().then((d) => {
      // Prefer a spread across releases / hip-hop / news; fall back to whatever exists.
      const spread = [
        d.releases[0],
        d.hiphop[0],
        d.news[0],
        d.releases[1],
        d.news[1],
      ].filter(Boolean) as NewsItem[];
      const list = spread.length ? spread : [...d.releases, ...d.hiphop, ...d.news];
      setItems(list.slice(0, 3));
    });
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <NewsCard key={it.link} item={it} />
      ))}
    </div>
  );
}
