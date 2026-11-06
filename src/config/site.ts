/**
 * Central site configuration. Streaming/social/contact values come from
 * NEXT_PUBLIC_* env vars (with safe placeholders) so they can be filled in
 * without code changes.
 *
 * NOTE: reference `process.env.NEXT_PUBLIC_*` DIRECTLY (not via an aliased
 * `process.env` object) — Next.js only inlines direct member access into the
 * client bundle; aliasing leaves a bare `process` that is undefined in browsers.
 */

// A *.vercel.app address is one deployment's own URL — it dies when that deployment is
// removed — so it never becomes the address in share links, the sitemap or canonical URLs.
const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
const siteUrl = envSiteUrl && !/\.vercel\.app/i.test(envSiteUrl) ? envSiteUrl : "https://darkmusicyard.com";

export const site = {
  name: "Dark Music Yard",
  shortName: "DMY",
  tagline: "Stream everywhere. Support directly here.",
  description:
    "Dark Music Yard (DMY) — official home for music, free beats, merch, feature bookings and brand partnerships.",
  // Used for canonical URLs, the sitemap and share links — set NEXT_PUBLIC_SITE_URL
  // to http://localhost:3000 for local development.
  url: siteUrl.replace(/\/$/, ""),

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

  /** Lenko Psycho's own socials — the "Follow" icons around the site, for the LA. */
  social: {
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com/@lenkopsycho",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/lenkopsycho",
    youtube: process.env.NEXT_PUBLIC_LENKO_YOUTUBE_URL || "https://www.youtube.com/@lenkopsycho",
  },

  /** Dark Music Yard's YouTube channel — where the official music videos are. */
  dmyYoutube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://youtube.com/@darkmusicyard",
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

/** localStorage key for "closed the top announcement bar" — new per campaign, so people who
 *  closed the last bar still see the new one. Read before the page paints (see app/layout.tsx). */
export const announceDismissKey = `dmy_announce_dismissed_${latestRelease.slug}_fan-rewards`;

/** License / copyright notice shown under every free beat. */
export const beatLicense =
  "Copyright © Dark Music Yard · Vince Cobbs. All rights reserved. Downloading this beat does not transfer ownership. Users may record and distribute songs using this beat on approved streaming platforms, but may not register the beat or resulting song with Content ID systems, claim copyright ownership, or issue copyright strikes against the producer or other authorized users.";

/** DMY Fan Rewards — the name for the site's fan prizes, led by Beat Breaker's monthly prize.
 *  The amount matches the backend's GAME_PRIZE (services/prizes.ts). */
export const fanRewards = {
  name: "DMY Fan Rewards",
  icons: "🧠🖤",
  tagline: "🧠 Think Different. 🖤 Stay Solid.",
  monthlyPrizeGhs: 1000,
  free: "No entry fee. No purchase or donation required.",
  where: "Open to fans in Ghana for now.", // prizes are paid to Ghana Mobile Money
} as const;
export const monthlyPrize = `GH₵${fanRewards.monthlyPrizeGhs.toLocaleString("en-US")}`;
/** Beat Breaker's announced prize for a month ("YYYY-MM"): GH₵1,000 from November 2026, GH₵500 before. */
export const prizeForMonth = (month: string) => (month < "2026-11" ? 500 : fanRewards.monthlyPrizeGhs);

/** The Book a Model page (/models and its terms). Hidden for now — set to true to bring it back.
 *  While hidden: out of the menu, footer and sitemap, the pages 404, and the account page stops
 *  offering model sign-up. Existing bookings, model dashboards and the admin tabs keep working. */
export const showModelsPage = false;

/** The fan activities (games, trivia, voting) — free, and secondary to the music. */
export const fanZone = {
  name: "Lenko Army Fan Zone",
  icons: "🧠🖤",
  description:
    "An official Dark Music Yard fan engagement experience created to promote our music, celebrate content creators, and appreciate loyal supporters through free entertainment, music trivia, and monthly fan recognition.",
  disclaimer:
    "All fan activities are free to participate in. No purchase is necessary. Promotional rewards, where offered, are sponsored by Dark Music Yard and subject to the published campaign rules.",
} as const;

// The music business first, the fan activities after it.
const allNavLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Artist Profile" },
  { href: "/music", label: "Music" },
  { href: "/free-beats", label: "Free Beats" },
  { href: "/merch", label: "Merch Shop" },
  { href: "/worn-on-set", label: "Worn on Set" },
  { href: "/live", label: "Live Shows" },
  { href: "/news", label: "News" },
  { href: "/shorts", label: "Shorts" },
  { href: "/behind-the-scenes", label: "Behind the Scenes" },
  { href: "/features", label: "Features" },
  { href: "/brand-promotion", label: "Brand Promotion" },
  { href: "/models", label: "Book a Model" },
  { href: "/support", label: "Support" },
  { href: "/games", label: "Lenko Army Fan Zone" },
  { href: "/games/lenko-trivia", label: "🧠 Lenko Army Music Trivia" },
  { href: "/games/leaderboard", label: "Fan Rankings" },
  { href: "/content-creators", label: "Creator Spotlight" },
  { href: "/fan-videos", label: "Fan Videos" },
  { href: "/community", label: "Lenko Army" },
  { href: "/contact", label: "Contact" },
] as const;

export const navLinks = allNavLinks.filter((l) => showModelsPage || l.href !== "/models");

/** Shown inline in the desktop navbar. Everything else in navLinks (except Home,
 *  which the logo covers) collapses into the "More" menu. */
export const primaryNavHrefs: string[] = ["/music", "/free-beats", "/merch", "/worn-on-set", "/live", "/news"];

/** Builds a wa.me link with an optional prefilled message. */
export function whatsappLink(message?: string): string {
  const num = site.contact.whatsapp;
  if (!num) return "#";
  const base = `https://wa.me/${num}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
