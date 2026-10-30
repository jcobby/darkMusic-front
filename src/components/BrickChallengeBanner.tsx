"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getGameRecord, type GameRecord } from "@/lib/api";

const KEY = "dmy_brick_banner_closed"; // { score, at } — the record they closed it on
const REOPEN_AFTER_MS = 7 * 86400e3;

/** Closed on this record? It comes back when someone beats it, or after a week. */
function closedFor(score: number | null) {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null") as { score: number | null; at: number } | null;
    return Boolean(c && c.score === score && Date.now() - c.at < REOPEN_AFTER_MS);
  } catch {
    return false;
  }
}

/**
 * The Brick Challenge: a slim strip under the header on every page (the music store
 * too) with this month's best Beat Breaker game — the score to beat. Not inside a game
 * (it would push the board down); closing it hides it until the record falls, or a week.
 */
export function BrickChallengeBanner() {
  const pathname = usePathname() || "/";
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [show, setShow] = useState(false);
  const hidden = pathname.startsWith("/admin") || /^\/games\/./.test(pathname);

  useEffect(() => {
    let live = true;
    const load = () =>
      getGameRecord().then((r) => {
        if (!live || !r) return;
        setRecord(r);
        setShow(!closedFor(r.best?.score ?? null));
      });
    void load();
    const id = setInterval(load, 5 * 60e3);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  if (hidden || !show || !record) return null;
  const best = record.best;
  return (
    <div className="relative overflow-hidden border-b border-yellow-400/25 bg-[#14041e]">
      {/* A faint brick wall behind it */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(#bf00ff 1px, transparent 1px), linear-gradient(90deg, #bf00ff 1px, transparent 1px), linear-gradient(90deg, #bf00ff 1px, transparent 1px)",
          backgroundSize: "100% 12px, 28px 24px, 28px 24px",
          backgroundPosition: "0 0, 0 0, 14px 12px",
        }}
      />
      <div className="container-page relative flex items-center gap-2.5 py-1.5 pr-8 text-[13px] sm:gap-3">
        <span aria-hidden className="flex shrink-0 gap-0.5">
          {["#f5c400", "#bf00ff", "#22d3ee"].map((c) => (
            <span key={c} className="block h-3 w-4 rounded-[3px]" style={{ background: c, boxShadow: `0 0 8px ${c}88` }} />
          ))}
        </span>
        <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 sm:inline">Brick Challenge</span>
        <span className="min-w-0 flex-1 truncate text-neutral-200">
          {best ? (
            <>
              <span className="sm:hidden">To beat: </span>
              <span className="hidden sm:inline">This month&apos;s best game: </span>
              <b className="font-display text-sm tabular-nums text-yellow-300">{best.score.toLocaleString()}</b>
              <span className="text-neutral-400"> by {best.name}</span>
              <span className="hidden sm:inline"> — can you beat it?</span>
            </>
          ) : (
            <>No best game yet this month — set the score to beat</>
          )}
        </span>
        <Link href="/games/beat-breaker" className="shrink-0 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-ink transition hover:bg-yellow-300">
          Beat it →
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, JSON.stringify({ score: best?.score ?? null, at: Date.now() }));
          } catch {
            /* private mode — just hide it for now */
          }
          setShow(false);
        }}
        aria-label="Close the Brick Challenge"
        className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
