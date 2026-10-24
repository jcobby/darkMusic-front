"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CheckInResult } from "@/lib/api";
import { useFanAuth } from "./FanAuthProvider";

/**
 * Checks a signed-in fan in for the day when they open the site (the reward grows
 * with the streak), then says what it earned for a few seconds — and celebrates a
 * promotion to a new Lenko Army rank.
 */
export function DailyCheckIn() {
  const { user, checkIn } = useFanAuth();
  const [shown, setShown] = useState<CheckInResult | null>(null);
  const triedOn = useRef<string | null>(null); // once a day per page load, even if it fails
  // Sit just below the sticky header (like the auction alerts, but on the left).
  const [top, setTop] = useState(80);

  useEffect(() => {
    if (!user) return;
    const day = new Date().toISOString().slice(0, 10);
    if (user.lastCheckIn === day || triedOn.current === day) return;
    triedOn.current = day;
    checkIn()
      .then((r) => !r.alreadyCheckedIn && setShown(r))
      .catch(() => {
        /* offline — the next visit checks in */
      });
  }, [user, checkIn]);

  useEffect(() => {
    if (!shown) return;
    const place = () => setTop(Math.max(8, (document.querySelector("header")?.getBoundingClientRect().bottom ?? 72) + 8));
    place();
    window.addEventListener("scroll", place, { passive: true });
    const id = setTimeout(() => setShown(null), shown.promoted ? 9000 : 6000);
    return () => {
      window.removeEventListener("scroll", place);
      clearTimeout(id);
    };
  }, [shown]);

  if (!shown) return null;
  const base = shown.awarded - shown.bonus;
  const title = shown.promoted
    ? `🎖️ Promoted to ${shown.promoted}!`
    : shown.streak > 1
      ? `🔥 Day ${shown.streak} in a row`
      : "✓ Checked in for today";
  const detail = shown.promoted
    ? `${shown.streak}-day streak · +${base} points + ${shown.bonus} bonus`
    : `+${base} points${shown.tomorrow && shown.tomorrow > base ? ` · tomorrow +${shown.tomorrow}` : shown.streak === 1 ? " · come back tomorrow to start a streak" : ""}`;

  return (
    <div role="status" style={{ top }} className="fixed inset-x-3 z-[45] animate-fade-up sm:right-auto sm:left-5 sm:w-[22rem]">
      <div
        className={`flex items-center gap-3 rounded-2xl border p-2.5 pr-1.5 shadow-card backdrop-blur-md ${
          shown.promoted ? "border-yellow-400/70 bg-ink-800/95" : "border-accent/40 bg-ink-800/95"
        }`}
      >
        <div className="min-w-0 flex-1 pl-1">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="truncate text-xs text-neutral-300">{detail}</p>
        </div>
        <Link
          href="/account#army"
          onClick={() => setShown(null)}
          className="inline-flex min-h-[40px] shrink-0 items-center rounded-full bg-accent px-3 text-xs font-bold text-white"
        >
          Your rank
        </Link>
        <button
          type="button"
          onClick={() => setShown(null)}
          aria-label="Dismiss"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
