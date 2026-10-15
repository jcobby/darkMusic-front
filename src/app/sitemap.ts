import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { GAMES } from "@/lib/games";
import { getReleases, getMerch, getWornItems, getLiveShows } from "@/lib/api";

// Rebuilt hourly so new releases, merch and shows get listed for search engines.
export const revalidate = 3600;

const STATIC: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, freq: "daily" },
  { path: "/music", priority: 0.9, freq: "weekly" },
  { path: "/about", priority: 0.8, freq: "monthly" },
  { path: "/free-beats", priority: 0.8, freq: "weekly" },
  { path: "/games", priority: 0.8, freq: "weekly" },
  { path: "/games/leaderboard", priority: 0.6, freq: "daily" },
  { path: "/worn-on-set", priority: 0.8, freq: "daily" },
  { path: "/merch", priority: 0.7, freq: "weekly" },
  { path: "/live", priority: 0.7, freq: "weekly" },
  { path: "/news", priority: 0.6, freq: "daily" },
  { path: "/behind-the-scenes", priority: 0.6, freq: "weekly" },
  { path: "/content-creators", priority: 0.6, freq: "weekly" },
  { path: "/fan-videos", priority: 0.6, freq: "weekly" },
  { path: "/community", priority: 0.5, freq: "daily" },
  { path: "/models", priority: 0.5, freq: "weekly" },
  { path: "/shorts", priority: 0.5, freq: "weekly" },
  { path: "/support", priority: 0.5, freq: "monthly" },
  { path: "/features", priority: 0.5, freq: "monthly" },
  { path: "/brand-promotion", priority: 0.4, freq: "monthly" },
  { path: "/contact", priority: 0.4, freq: "yearly" },
  { path: "/models/terms", priority: 0.2, freq: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [releases, merch, worn, shows] = await Promise.all([getReleases(), getMerch(), getWornItems(), getLiveShows()]);
  return [
    ...STATIC.map((s) => ({ url: `${site.url}${s.path}`, lastModified: now, changeFrequency: s.freq, priority: s.priority })),
    ...GAMES.map((g) => ({ url: `${site.url}/games/${g.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...releases.map((r) => ({ url: `${site.url}/music/${r.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...merch.map((m) => ({ url: `${site.url}/merch/${m.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...worn.map((m) => ({ url: `${site.url}/worn-on-set/${m.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
    ...shows.map((s) => ({ url: `${site.url}/live/${s.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
