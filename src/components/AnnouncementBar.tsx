"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { latestRelease, latestReleaseByline, announceDismissKey as KEY } from "@/config/site";

const MESSAGES: { id: string; text: ReactNode; short: ReactNode; cta: string; href: string }[] = [
  {
    id: "release",
    text: (
      <>
        🔥 Out now: <span className="font-bold">{latestRelease.title}</span> — {latestReleaseByline}
      </>
    ),
    short: (
      <>
        🔥 Out now: <span className="font-bold">{latestRelease.title}</span>
      </>
    ),
    cta: "Listen now",
    href: "/#latest",
  },
  {
    id: "merch",
    text: (
      <>
        🛍 Official <span className="font-bold">Dark Music Yard</span> merch — pay with Mobile Money or card
      </>
    ),
    short: (
      <>
        🛍 Official <span className="font-bold">DMY merch</span>
      </>
    ),
    cta: "Shop now",
    href: "/merch",
  },
];

/** Slim, dismissible site-wide strip that rotates the latest release and the merch store (the music business — fan activities stay off it). */
export function AnnouncementBar() {
  // Rendered from the first paint (not added after loading), so it never pushes the header and
  // the hero down while someone is tapping them. A closed bar is hidden before paint by the
  // `dmy-announce-off` class layout.tsx sets on <html>, then removed here.
  const [show, setShow] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Not inside a game: it would push the board down on phones (and plug the game you're playing).
  const inGame = usePathname()?.startsWith("/games/") ?? false;

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setShow(false);
    } catch {
      /* private mode — keep it */
    }
  }, []);

  // Rotate every 6s (not while hovered, and not for reduced-motion visitors).
  useEffect(() => {
    if (!show || inGame || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 6000);
    return () => clearInterval(id);
  }, [show, inGame, paused]);

  if (!show || inGame) return null;
  const m = MESSAGES[index];

  return (
    <div
      className="dmy-announce relative bg-gradient-to-r from-accent-deep via-accent to-accent-deep text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        key={m.id}
        className="container-page flex animate-fade-up items-center justify-center gap-3 py-2 pr-8 text-center text-[13px] font-semibold sm:text-sm"
      >
        <span className="truncate sm:hidden">{m.short}</span>
        <span className="hidden truncate sm:inline">{m.text}</span>
        <Link
          href={m.href}
          className="shrink-0 rounded-full bg-ink/90 px-3 py-1 text-xs font-bold text-white transition hover:bg-ink"
        >
          {m.cta} →
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* private mode — just hide it for now */
          }
          setShow(false);
        }}
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-white/80 transition hover:bg-black/15 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
