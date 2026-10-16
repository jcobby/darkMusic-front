"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { getLeaderboard, type Leaderboard } from "@/lib/api";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { BoardRow, PrizeRules, monthName, timeLeft } from "./LeaderboardParts";

/**
 * This month's Beat Breaker prize table under the game: the top 10, then — if the
 * player is further down — their own place with the players around them, and a
 * link to the full board. `refreshKey` reloads it after a submitted run.
 */
export const PrizeLeaderboard = memo(function PrizeLeaderboard({ game, refreshKey = 0 }: { game: string; refreshKey?: number }) {
  const { user } = useFanAuth();
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [rules, setRules] = useState(false);

  useEffect(() => {
    let live = true;
    getLeaderboard(game, getFanToken(), { limit: 10 }).then((b) => live && setBoard(b));
    return () => {
      live = false;
    };
  }, [game, refreshKey, user?.id]);

  if (!board) return null;
  const me = board.me;
  // Rows around the player that aren't already in the top 10
  const below = me && me.rank && me.rank > board.top.length ? me.around.filter((r) => r.rank > board.top.length) : [];
  return (
    <div className="card mx-auto mt-6 max-w-md overflow-hidden">
      <div className="relative border-b border-white/[0.06] bg-gradient-to-r from-accent-deep/50 to-transparent p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Monthly prize · {monthName(board.month)}</p>
        <p className="mt-1 font-display text-2xl font-bold text-white">
          💰 GH₵{board.prizeGhs.toLocaleString()} prize pool
          {board.funded && (
            <span className="ml-2 align-middle rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">✓ Deposited</span>
          )}
        </p>
        <p className="mt-1 text-sm text-neutral-300">
          Top score at the end of the month — straight to their DMY wallet · <span className="font-semibold text-white">{timeLeft(board.endsAt)}</span>
        </p>
        {!user && (
          <Link href="/account" className="btn-accent mt-3 min-h-[44px] text-sm">
            Sign in to compete
          </Link>
        )}
        {me?.rank && (
          <p className="mt-2 text-sm text-white">
            You&apos;re <b>#{me.rank}</b> of {board.total.toLocaleString()} · best <b>{me.score.toLocaleString()}</b>
          </p>
        )}
      </div>

      {board.top.length === 0 ? (
        <p className="p-5 text-sm text-neutral-400">No scores yet this month — the top spot is yours to take.</p>
      ) : (
        <ol className="divide-y divide-white/[0.04]">
          {board.top.map((r) => (
            <BoardRow key={r.rank} r={r} />
          ))}
          {below.length > 0 && (
            <>
              <li aria-hidden className="py-1 text-center text-neutral-600">
                ⋯
              </li>
              {below.map((r) => (
                <BoardRow key={r.rank} r={r} />
              ))}
            </>
          )}
        </ol>
      )}

      <Link
        href="/games/leaderboard"
        className="flex min-h-[48px] items-center justify-between border-t border-white/[0.06] px-5 py-3 text-sm font-semibold text-accent hover:bg-white/[0.02]"
      >
        <span>See the full leaderboard{board.total > 0 ? ` · ${board.total.toLocaleString()} players` : ""}</span>
        <span aria-hidden>→</span>
      </Link>

      <div className="border-t border-white/[0.06] px-5 py-3">
        <button
          type="button"
          onClick={() => setRules((v) => !v)}
          className="min-h-[36px] text-xs font-semibold text-neutral-400 hover:text-white"
        >
          {rules ? "Hide prize rules" : "Prize rules"}
        </button>
        {rules && (
          <div className="mt-2">
            <PrizeRules prizeGhs={board.prizeGhs} />
          </div>
        )}
      </div>
    </div>
  );
});
