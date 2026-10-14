"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandIcon } from "./BrandIcon";

interface Props {
  title: string;
  artist: string;
  spotifyUrl?: string | null;
  appleUrl?: string | null;
  youtubeUrl?: string | null;
  /** Internal page to buy/download the MP3, when it's on sale. */
  downloadHref?: string | null;
  /** Link that "Share" sends (the release page, or Spotify). */
  shareUrl: string;
}

/**
 * Big, thumb-friendly "where to listen" buttons for one track, plus Share and
 * Add-to-playlist prompts — so a fan always has an obvious next step.
 */
export function TrackActions({ title, artist, spotifyUrl, appleUrl, youtubeUrl, downloadHref, shareUrl }: Props) {
  const platforms = [
    { brand: "spotify" as const, label: "Play on Spotify", url: spotifyUrl },
    { brand: "apple" as const, label: "Apple Music", url: appleUrl },
    { brand: "youtube" as const, label: "YouTube", url: youtubeUrl },
  ].filter((p) => p.url);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
        {platforms.map((p, i) => (
          <a
            key={p.brand}
            href={p.url as string}
            target="_blank"
            rel="noopener noreferrer"
            className={`${i === 0 ? "btn-accent col-span-2 sm:col-span-1" : "btn-outline"} min-h-[48px]`}
          >
            <BrandIcon brand={p.brand} size={18} />
            {p.label}
          </a>
        ))}
        {downloadHref && (
          <Link href={downloadHref} className="btn-outline min-h-[48px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ShareButton title={`${title} — ${artist}`} url={shareUrl} />
        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm font-semibold text-neutral-300 transition hover:bg-white/5 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add to your playlist
          </a>
        )}
      </div>
    </div>
  );
}

/** Native share sheet on phones; a small menu (WhatsApp, X, Facebook, copy) elsewhere. */
export function ShareButton({
  title,
  url,
  className = "",
  label = "Share this track",
}: {
  title: string;
  url: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const message = label === "Share this track" ? `Listen to ${title}` : `Check out ${title}`;
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function share() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, text: message, url });
        return;
      } catch {
        /* cancelled or unsupported — fall back to the menu */
      }
    }
    setOpen((v) => !v);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  const text = encodeURIComponent(message);
  const link = encodeURIComponent(url);
  const targets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${text}%20${link}` },
    { label: "X (Twitter)", href: `https://twitter.com/intent/tweet?text=${text}&url=${link}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${link}` },
  ];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={share}
        aria-expanded={open}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white transition hover:border-accent/60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
        </svg>
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-52 rounded-2xl border border-white/10 bg-ink-800/95 p-1.5 shadow-card backdrop-blur-md">
          {targets.map((t) => (
            <a
              key={t.label}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm text-neutral-200 hover:bg-white/5 hover:text-white"
            >
              {t.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copy}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-white/5 hover:text-white"
          >
            {copied ? "✓ Link copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
