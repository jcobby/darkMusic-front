/**
 * Central site configuration. Streaming/social/contact values come from
 * NEXT_PUBLIC_* env vars (with safe placeholders) so they can be filled in
 * without code changes.
 *
 * NOTE: reference `process.env.NEXT_PUBLIC_*` DIRECTLY (not via an aliased
 * `process.env` object) — Next.js only inlines direct member access into the
 * client bundle; aliasing leaves a bare `process` that is undefined in browsers.
 */
export const site = {
  name: "Dark Music Yard",
  shortName: "DMY",
  tagline: "Stream everywhere. Support directly here.",
  description:
    "Dark Music Yard (DMY) — official home for music, free beats, merch, feature bookings and brand partnerships.",
  // Used for canonical URLs, the sitemap and share links — set NEXT_PUBLIC_SITE_URL
  // to http://localhost:3000 for local development.
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://darkmusicyard.com").replace(/\/$/, ""),

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@darkmusicyard.com",
    management: process.env.NEXT_PUBLIC_MANAGEMENT_EMAIL || "info@darkmusicyard.com",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "", // digits only, e.g. 233xxxxxxxxx
  },

  streaming: {
    spotify: process.env.NEXT_PUBLIC_SPOTIFY_URL || "",
    apple: process.env.NEXT_PUBLIC_APPLE_MUSIC_URL || "",
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "",
  },

  /** Lenko Psycho's socials — the "Follow" icons around the site. */
  social: {
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com/@lenkopsycho",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/lenkopsycho",
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://youtube.com/@darkmusicyard",
  },
} as const;

/** A single the site promotes before (or without) it being added in /admin. */
export interface ConfigRelease {
  slug: string;
  title: string;
  artist: string;
  featuring: string | null;
  releaseDate: string; // YYYY-MM-DD
  coverImage: string;
  spotifyUrl: string;
  credits: string;
  blurb: string;
}

/**
 * The release the whole site is pushing right now — home spotlight, hero chip,
 * announcement bar, Music page, About page and the games all read from here.
 * When a release with this `slug` is added in /admin, the home spotlight uses
 * that entry (its own page, MP3 sales…) instead of these details.
 */
export const latestRelease: ConfigRelease = {
  slug: "stubborn-abele",
  title: "Stubborn Abele",
  artist: "Lenko Psycho",
  featuring: null,
  releaseDate: "2026-10-10",
  coverImage: "/releases/stubborn-abele.jpg",
  spotifyUrl: "https://open.spotify.com/track/3qxI6DTHPerMMnbOAYup7k",
  credits: "Prod. by Roddy Hanz · A Dark Music Yard production",
  blurb: "“Stubborn Abele” — the new single from Lenko Psycho, produced by Roddy Hanz. Out now on every platform.",
};

/** The single before it — still in the games until it's in the catalogue. */
export const previousRelease: ConfigRelease = {
  slug: "its-working",
  title: "It's Working",
  artist: "Lenko Psycho",
  featuring: "Lalid & Kofi Mole",
  releaseDate: "2026-10-02",
  coverImage: "/releases/its-working.jpg",
  spotifyUrl: "https://open.spotify.com/track/6VDhfy0140KE4RqL99dMwf",
  credits: "Beat by Roddy Hanz · Mixed & mastered by Appietus",
  blurb: "“It's Working” — Lenko Psycho featuring Lalid & Kofi Mole. A Dark Music Yard production.",
};

export const recentSingles: ConfigRelease[] = [latestRelease, previousRelease];

/** "Stubborn Abele · out now", or "Title ft. Guest" for a feature. */
export const latestReleaseLabel = latestRelease.featuring
  ? `${latestRelease.title} ft. ${latestRelease.featuring}`
  : `${latestRelease.title} · out now`;

/** "Lenko Psycho" or "Lenko Psycho ft. Guest" */
export const latestReleaseByline = latestRelease.featuring
  ? `${latestRelease.artist} ft. ${latestRelease.featuring}`
  : latestRelease.artist;

/** License / copyright notice shown under every free beat. */
export const beatLicense =
  "Copyright © Dark Music Yard · Vince Cobbs. All rights reserved. Downloading this beat does not transfer ownership. Users may record and distribute songs using this beat on approved streaming platforms, but may not register the beat or resulting song with Content ID systems, claim copyright ownership, or issue copyright strikes against the producer or other authorized users.";

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Artist Profile" },
  { href: "/music", label: "Music" },
  { href: "/free-beats", label: "Free Beats" },
  { href: "/worn-on-set", label: "Worn on Set" },
  { href: "/models", label: "Book a Model" },
  { href: "/merch", label: "Merch Shop" },
  { href: "/news", label: "News" },
  { href: "/live", label: "Live Shows" },
  { href: "/shorts", label: "Shorts" },
  { href: "/behind-the-scenes", label: "Behind the Scenes" },
  { href: "/content-creators", label: "Content Creators" },
  { href: "/fan-videos", label: "Fan Videos" },
  { href: "/community", label: "Lenko Army" },
  { href: "/games", label: "Games" },
  { href: "/games/leaderboard", label: "Game Leaderboard" },
  { href: "/support", label: "Support" },
  { href: "/features", label: "Features" },
  { href: "/brand-promotion", label: "Brand Promotion" },
  { href: "/contact", label: "Contact" },
] as const;

/** Shown inline in the desktop navbar. Everything else in navLinks (except Home,
 *  which the logo covers) collapses into the "More" menu. */
export const primaryNavHrefs: string[] = [
  "/music",
  "/free-beats",
  "/worn-on-set",
  "/news",
  "/content-creators",
  "/community",
  "/models",
];

/** Builds a wa.me link with an optional prefilled message. */
export function whatsappLink(message?: string): string {
  const num = site.contact.whatsapp;
  if (!num) return "#";
  const base = `https://wa.me/${num}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
