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
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "lenkogh.music@gmail.com",
    management: process.env.NEXT_PUBLIC_MANAGEMENT_EMAIL || "lenkogh.music@gmail.com",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "", // digits only, e.g. 233xxxxxxxxx
  },

  streaming: {
    spotify: process.env.NEXT_PUBLIC_SPOTIFY_URL || "",
    apple: process.env.NEXT_PUBLIC_APPLE_MUSIC_URL || "",
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "",
  },

  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  },
} as const;

/** License / copyright notice shown under every free beat. */
export const beatLicense =
  "Copyright © Dark Music Yard · Vince Cobbs. All rights reserved. Downloading this beat does not transfer ownership. Users may record and distribute songs using this beat on approved streaming platforms, but may not register the beat or resulting song with Content ID systems, claim copyright ownership, or issue copyright strikes against the producer or other authorized users.";

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/music", label: "Music" },
  { href: "/free-beats", label: "Free Beats" },
  { href: "/merch", label: "Merch" },
  { href: "/features", label: "Features" },
  { href: "/brand-promotion", label: "Brand Promotion" },
  { href: "/contact", label: "Contact" },
] as const;

/** Builds a wa.me link with an optional prefilled message. */
export function whatsappLink(message?: string): string {
  const num = site.contact.whatsapp;
  if (!num) return "#";
  const base = `https://wa.me/${num}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
