"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "dmy_contest_bar_dismissed";

/** Slim, dismissible site-wide strip promoting the GH₵4,000 video contest. */
export function ContestPromoBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem(KEY) !== "1");
  }, []);

  if (!show) return null;

  return (
    <div className="relative bg-gradient-to-r from-accent to-glow-cyan text-ink">
      <div className="container-page flex items-center justify-center gap-3 py-2 pr-8 text-center text-[13px] font-semibold sm:text-sm">
        <span className="truncate">
          🏆 Best creator &amp; fan videos each win <span className="font-bold">GH₵4,000</span> — vote now
        </span>
        <Link
          href="/content-creators"
          className="shrink-0 rounded-full bg-ink/90 px-3 py-1 text-xs font-bold text-white transition hover:bg-ink"
        >
          Vote now →
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setShow(false);
        }}
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-ink/70 transition hover:bg-black/10 hover:text-ink"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
