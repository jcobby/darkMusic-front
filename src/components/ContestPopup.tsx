"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { useSpotifyPlayer } from "./SpotifyPlayer";

const SESSION_KEY = "dmy_contest_toast_shown"; // once per browser session
const DISMISS_KEY = "dmy_contest_toast_dismissed_until"; // closed → quiet for a week
const DISMISS_DAYS = 7;
const DELAY_MS = 5000;

// Pages where the reminder would be redundant or in the way.
// (Free Beats has its own floating "Support the Yard" button in that corner.)
const SKIP = ["/content-creators", "/fan-videos", "/games", "/admin", "/checkout", "/cart", "/account", "/live", "/free-beats"];

function storage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * A small, dismissible reminder about the GH₵4,000 video contest. It never
 * covers the page on arrival: it waits until the visitor has been here a few
 * seconds AND scrolled past the hero (so the music comes first), shows at most
 * once per session, and stays quiet for a week once closed.
 */
export function ContestPopup() {
  const pathname = usePathname() ?? "/";
  const [show, setShow] = useState(false);
  const { current } = useAudioPlayer();
  const { activeId } = useSpotifyPlayer();

  useEffect(() => {
    if (SKIP.some((p) => pathname.startsWith(p))) return;
    const session = storage("session");
    const local = storage("local");
    if (session?.getItem(SESSION_KEY)) return;
    if (Number(local?.getItem(DISMISS_KEY) || 0) > Date.now()) return;

    let waited = false;
    let scrolled = false;
    const maybeShow = () => {
      if (!waited || !scrolled) return;
      session?.setItem(SESSION_KEY, "1");
      setShow(true);
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.6) {
        scrolled = true;
        maybeShow();
      }
    };
    const timer = setTimeout(() => {
      waited = true;
      maybeShow();
    }, DELAY_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  function dismiss() {
    storage("local")?.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400000));
    setShow(false);
  }

  if (!show) return null;
  // Sit above the mini player / Spotify bar when one is open.
  const playerOpen = Boolean(current || activeId);

  return (
    <div
      role="dialog"
      aria-label="Video contest"
      className={`fixed inset-x-3 z-[45] animate-fade-up sm:left-5 sm:right-auto sm:w-[22rem] ${
        playerOpen ? "bottom-[6.75rem]" : "bottom-3 sm:bottom-5"
      }`}
    >
      <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-accent/40 bg-ink-800/95 p-2.5 pr-1.5 shadow-card backdrop-blur-md">
        <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-accent/25 blur-2xl" />
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-lg shadow-glow-sm" aria-hidden>
          🏆
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-white">Win GH₵4,000 — video contest</p>
          <p className="mt-0.5 truncate text-xs text-neutral-400">Vote for the best creator &amp; fan videos by 31 Dec.</p>
        </div>
        <Link
          href="/content-creators"
          onClick={dismiss}
          className="relative inline-flex min-h-[40px] shrink-0 items-center rounded-full bg-accent px-3 text-xs font-bold text-white"
        >
          Vote
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
