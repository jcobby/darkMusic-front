"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLeaderboard, type Leaderboard } from "@/lib/api";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { PRIZE_GAME, timeLeft } from "./LeaderboardParts";
import { fanRewards } from "@/config/site";

/**
 * One tap to the leaderboard: who's leading, how many are playing, and — for a
 * signed-in player — their own rank. Still a working link if the board can't load.
 */
export function LeaderboardTeaser({ className = "" }: { className?: string }) {
  const { user } = useFanAuth();
  const [board, setBoard] = useState<Leaderboard | null>(null);

  useEffect(() => {
    let live = true;
    getLeaderboard(PRIZE_GAME, getFanToken(), { limit: 1 }).then((b) => live && setBoard(b));
    return () => {
      live = false;
    };
  }, [user?.id]);

  const leader = board?.leader;
  const me = board?.me?.rank ? board.me : null;
  return (
    <Link
      href="/games/leaderboard"
      className={`group flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-white/10 bg-ink-800/80 p-4 transition hover:border-accent/60 sm:px-5 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 text-xl" aria-hidden>
          🏆
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">
            Beat Breaker fan rankings · 🏆 GH₵{(board?.prizeGhs ?? fanRewards.monthlyPrizeGhs).toLocaleString()} sponsored by DMY
            {board?.funded && (
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">✓ Funded</span>
            )}
          </p>
          <p className="truncate text-sm text-neutral-400">
            {leader
              ? `Leader: ${leader.mine ? "You" : leader.name} · ${leader.score.toLocaleString()}`
              : board?.rules === "daily"
                ? "Biggest month total wins the fan prize"
                : "Top score this month wins the fan prize"}
            {board && board.total > 0 && ` · ${board.total.toLocaleString()} playing`}
            {board && !board.ended && ` · ${timeLeft(board.endsAt)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {me && (
          <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-white">You&apos;re #{me.rank}</span>
        )}
        <span className="btn-accent min-h-[44px] text-sm">
          See the rankings <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}
