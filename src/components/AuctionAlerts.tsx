"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMyBids, type MyBid } from "@/lib/api";
import { useFanAuth, getFanToken } from "./FanAuthProvider";

const KEY = "dmy_auction_alerts_dismissed";
const POLL_MS = 45_000;
const ghs = (n: number) => `GH₵${n.toLocaleString("en-US")}`;

function dismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

/** One alert per state change: a new higher bid → a new outbid alert. */
const alertKey = (b: MyBid) => `${b.slug}:${b.status}:${b.status === "outbid" ? b.highBidGhs : ""}`;

/**
 * In-site notifications for auctions: "you've been outbid" and "you won — pay
 * now", shown just under the header on any page (emails go out too).
 */
export function AuctionAlerts() {
  const { user } = useFanAuth();
  const pathname = usePathname() ?? "/";
  const [alert, setAlert] = useState<MyBid | null>(null);
  // Sit just below the sticky header (which moves while the announcement bar is on screen).
  const [top, setTop] = useState(80);
  useEffect(() => {
    if (!alert) return;
    const place = () => {
      const header = document.querySelector("header");
      setTop(Math.max(8, (header?.getBoundingClientRect().bottom ?? 72) + 8));
    };
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [alert]);

  const check = useCallback(async () => {
    const token = getFanToken();
    if (!token || document.hidden) return;
    const bids = await getMyBids(token);
    const seen = dismissed();
    const candidates = bids.filter(
      (b) => (b.status === "won" || b.status === "outbid") && !seen.includes(alertKey(b)) && b.path !== pathname
    );
    // Winning (pay now) matters more than being outbid.
    setAlert(candidates.find((b) => b.status === "won") ?? candidates[0] ?? null);
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      setAlert(null);
      return;
    }
    void check();
    const id = setInterval(() => void check(), POLL_MS);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, check]);

  function dismiss() {
    if (!alert) return;
    try {
      localStorage.setItem(KEY, JSON.stringify([...dismissed(), alertKey(alert)].slice(-60)));
    } catch {
      /* storage blocked — it just shows again later */
    }
    setAlert(null);
  }

  if (!alert) return null;
  const won = alert.status === "won";

  return (
    <div
      role="status"
      style={{ top }}
      className="fixed inset-x-3 z-[46] animate-fade-up sm:left-auto sm:right-5 sm:w-[23rem]"
    >
      <div
        className={`flex items-center gap-3 rounded-2xl border p-2.5 pr-1.5 shadow-card backdrop-blur-md ${
          won ? "border-accent bg-accent-deep/95" : "border-accent/40 bg-ink-800/95"
        }`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-lg" aria-hidden>
          {won ? "🎉" : "⚡"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{won ? `You won ${alert.name}!` : `Outbid on ${alert.name}`}</p>
          <p className="truncate text-xs text-neutral-300">
            {won
              ? `Pay ${ghs(alert.highBidGhs ?? alert.myBestBidGhs)} to secure it`
              : `Top bid is now ${ghs(alert.highBidGhs ?? 0)}`}
          </p>
        </div>
        <Link
          href={alert.path}
          onClick={() => setAlert(null)}
          className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full px-3 text-xs font-bold ${
            won ? "bg-white text-ink" : "bg-accent text-white"
          }`}
        >
          {won ? "Pay now" : "Bid again"}
        </Link>
        <button
          type="button"
          onClick={dismiss}
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
