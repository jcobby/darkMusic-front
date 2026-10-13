"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { latestRelease } from "@/config/site";

// New key per campaign, so people who closed the old contest-only bar see the new release.
const KEY = "dmy_announce_dismissed_its_working";

const MESSAGES: { id: string; text: ReactNode; short: ReactNode; cta: string; href: string }[] = [
  {
    id: "release",
    text: (
      <>
        🔥 Out now: <span className="font-bold">{latestRelease.title}</span> — {latestRelease.artist} ft.{" "}
        {latestRelease.featuring}
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
    id: "contest",
    text: (
      <>
        🏆 Best creator &amp; fan videos each win <span className="font-bold">GH₵4,000</span>
      </>
    ),
    short: (
      <>
        🏆 Win <span className="font-bold">GH₵4,000</span> — video contest
      </>
    ),
    cta: "Vote now",
    href: "/content-creators",
  },
];

/** Slim, dismissible site-wide strip that alternates between the latest release and the contest. */
export function AnnouncementBar() {
  const [show, setShow] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);

  // Rotate every 6s (not while hovered, and not for reduced-motion visitors).
  useEffect(() => {
    if (!show || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 6000);
    return () => clearInterval(id);
  }, [show, paused]);

  if (!show) return null;
  const m = MESSAGES[index];

  return (
    <div
      className="relative bg-gradient-to-r from-accent-deep via-accent to-accent-deep text-white"
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
