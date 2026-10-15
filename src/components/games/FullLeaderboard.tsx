"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getLeaderboard, type Leaderboard, type LeaderboardRow } from "@/lib/api";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { PrizeWithdraw } from "./PrizeWithdraw";
import { BoardRow, PRIZE_GAME, PrizeRules, YourPosition, monthName, timeLeft } from "./LeaderboardParts";

const PAGE = 50;

// Worked out at fetch time (not while rendering) so server and browser markup always match.
const lastMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
};
type Tab = "current" | "last";
const monthFor = (t: Tab) => (t === "last" ? lastMonth() : undefined);
const TABS: { key: Tab; label: string }[] = [
  { key: "current", label: "This month" },
  { key: "last", label: "Last month" },
];

const PRIZE_NOTE = {
  won: "Waiting for the winner to withdraw",
  requested: "Prize being paid",
  paid: "Prize paid ✓",
} as const;

/** The whole Beat Breaker board: this month or last, 50 players at a time, with your own position on top. */
export function FullLeaderboard() {
  const { user } = useFanAuth();
  const [tab, setTab] = useState<Tab>("current");
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    getLeaderboard(PRIZE_GAME, getFanToken(), { month: monthFor(tab), limit: PAGE }).then((b) => {
      if (!live) return;
      setBoard(b);
      setRows(b?.top ?? []);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [tab, user?.id]);

  const loadMore = useCallback(async () => {
    if (!board) return;
    setMore(true);
    const b = await getLeaderboard(PRIZE_GAME, getFanToken(), { month: board.month, offset: rows.length, limit: PAGE });
    if (b) setRows((r) => [...r, ...b.top.filter((x) => x.rank > r.length)]);
    setMore(false);
  }, [board, rows.length]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PrizeWithdraw />

      {/* Month switch */}
      <div className="flex gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold transition ${
              tab === t.key ? "bg-accent text-white" : "border border-white/10 text-neutral-300 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!board ? (
        <div className="card p-10 text-center text-neutral-500">{loading ? "Loading the leaderboard…" : "Couldn't load the leaderboard."}</div>
      ) : (
        <>
          {/* Prize summary */}
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-r from-accent-deep/60 to-transparent p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">{monthName(board.month)}</p>
              <p className="mt-1 font-display text-2xl font-bold text-white">🏆 GH₵{board.prizeGhs.toLocaleString()} for the top score</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">{board.ended ? "Status" : "Time left"}</p>
                  <p className="font-semibold text-white">{board.ended ? "Ended" : timeLeft(board.endsAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">Players</p>
                  <p className="font-semibold text-white">{board.total.toLocaleString()}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">{board.ended ? "Winner" : "Leader"}</p>
                  <p className="truncate font-semibold text-white">
                    {board.leader ? `${board.leader.mine ? "You" : board.leader.name} · ${board.leader.score.toLocaleString()}` : "—"}
                  </p>
                </div>
              </div>
              {board.ended && board.prize && <p className="mt-3 text-sm text-neutral-200">{PRIZE_NOTE[board.prize.status]}</p>}
            </div>
          </div>

          <YourPosition board={board} signedIn={Boolean(user)} />

          {/* The board */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 text-xs text-neutral-400">
              <span>Rank · player · level</span>
              <span>Score</span>
            </div>
            {rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-400">
                {board.ended ? "Nobody played that month." : "No scores yet this month — the top spot is yours to take."}
              </p>
            ) : (
              <ol className="divide-y divide-white/[0.04]">
                {rows.map((r) => (
                  <BoardRow key={r.rank} r={r} winner={board.ended} />
                ))}
              </ol>
            )}
            {rows.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3 text-xs text-neutral-400">
                <span>
                  Showing 1–{rows.length.toLocaleString()} of {board.total.toLocaleString()}
                </span>
                {rows.length < board.total && (
                  <button type="button" onClick={loadMore} disabled={more} className="btn-outline min-h-[44px] text-sm">
                    {more ? "Loading…" : `Show ${Math.min(PAGE, board.total - rows.length)} more`}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/games/beat-breaker" className="btn-accent min-h-[48px]">
              ▶ Play Beat Breaker
            </Link>
            <Link href="/games" className="btn-ghost min-h-[44px] text-sm">
              All games
            </Link>
          </div>

          <div className="card p-5">
            <p className="mb-2 text-sm font-semibold text-white">Prize rules</p>
            <PrizeRules prizeGhs={board.prizeGhs} />
          </div>
        </>
      )}
    </div>
  );
}
