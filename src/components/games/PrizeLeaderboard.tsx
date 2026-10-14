"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLeaderboard, type Leaderboard } from "@/lib/api";
import { getFanToken, useFanAuth } from "../FanAuthProvider";

const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

function timeLeft(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

/** This month's Beat Breaker prize table. `refreshKey` reloads it after a submitted run. */
export function PrizeLeaderboard({ game, refreshKey = 0 }: { game: string; refreshKey?: number }) {
  const { user } = useFanAuth();
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [rules, setRules] = useState(false);

  useEffect(() => {
    let live = true;
    getLeaderboard(game, getFanToken()).then((b) => live && setBoard(b));
    return () => {
      live = false;
    };
  }, [game, refreshKey, user?.id]);

  if (!board) return null;
  return (
    <div className="card mx-auto mt-6 max-w-md overflow-hidden">
      <div className="relative border-b border-white/[0.06] bg-gradient-to-r from-accent-deep/50 to-transparent p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Monthly prize · {monthName(board.month)}</p>
        <p className="mt-1 font-display text-2xl font-bold text-white">
          🏆 GH₵{board.prizeGhs.toLocaleString()} for the top score
        </p>
        <p className="mt-1 text-sm text-neutral-300">
          Highest Beat Breaker score at the end of the month wins · <span className="font-semibold text-white">{timeLeft(board.endsAt)}</span>
        </p>
        {!user && (
          <Link href="/account" className="btn-accent mt-3 min-h-[44px] text-sm">
            Sign in to compete
          </Link>
        )}
        {board.me && (
          <p className="mt-2 text-sm text-white">
            Your best: <b>{board.me.score.toLocaleString()}</b> · rank <b>#{board.me.rank}</b>
          </p>
        )}
      </div>

      {board.top.length === 0 ? (
        <p className="p-5 text-sm text-neutral-400">No scores yet this month — the top spot is yours to take.</p>
      ) : (
        <ol className="divide-y divide-white/[0.04]">
          {board.top.slice(0, 10).map((r) => (
            <li
              key={r.rank}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm ${r.mine ? "bg-accent/10" : ""}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  r.rank === 1 ? "bg-accent text-white" : "bg-white/5 text-neutral-300"
                }`}
              >
                {r.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-white">
                {r.mine ? "You" : r.name}
                <span className="ml-2 text-xs text-neutral-500">lvl {r.level}</span>
              </span>
              <span className="font-semibold tabular-nums text-white">{r.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="border-t border-white/[0.06] px-5 py-3">
        <button
          type="button"
          onClick={() => setRules((v) => !v)}
          className="min-h-[36px] text-xs font-semibold text-neutral-400 hover:text-white"
        >
          {rules ? "Hide prize rules" : "Prize rules"}
        </button>
        {rules && (
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-neutral-400">
            <li>• Only Beat Breaker counts. Play while signed in — each finished game is checked and your best score of the month is kept.</li>
            <li>• The highest score at 23:59 GMT on the last day of the month wins GH₵{board.prizeGhs}. A tie goes to whoever reached it first.</li>
            <li>• One account per person. DMY reviews the top scores before paying and may disqualify cheating or automated play.</li>
            <li>• The winner is contacted by email and paid by Mobile Money within 7 days.</li>
          </ul>
        )}
      </div>
    </div>
  );
}
