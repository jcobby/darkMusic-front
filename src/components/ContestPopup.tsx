"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "dmy_contest_popup_seen";

/** First-visit popup announcing the GH₵4,000 video contest (shows once). */
export function ContestPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(KEY) === "1") return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  function close() {
    localStorage.setItem(KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="card animate-fade-up relative w-full max-w-md overflow-hidden p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <p className="eyebrow justify-center">
          <span className="h-px w-6 bg-accent" /> Contest · 2026
        </p>
        <h2 className="gradient-text mt-3 font-display text-5xl font-bold">GH₵4,000</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-300">
          Two prizes: the <span className="text-white">content creator</span> and the{" "}
          <span className="text-white">fan</span> whose video gets the most votes by{" "}
          <span className="font-semibold text-white">31 Dec 2026</span> each win{" "}
          <span className="font-semibold text-white">GH₵4,000</span>. Cast your one vote below.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/content-creators" onClick={close} className="btn-accent justify-center">
            Vote — Content Creators
          </Link>
          <Link href="/fan-videos" onClick={close} className="btn-outline justify-center">
            Vote — Fan Videos
          </Link>
        </div>
      </div>
    </div>
  );
}
