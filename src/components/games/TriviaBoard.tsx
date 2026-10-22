"use client";

import { useEffect, useState } from "react";
import { getTriviaBoard, type TriviaBoard } from "@/lib/api";

const ghs = (n: number) => `GH₵${n.toLocaleString()}`;
const when = (d: string) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

/**
 * The Lenko Trivia leaderboard: everyone who got their question right, newest first
 * (each shows once their round is over). Names shortened; answers are never shown.
 */
export function TriviaBoardList({
  initial,
  refreshKey = 0,
  limit,
  className = "",
}: {
  initial: TriviaBoard;
  refreshKey?: number;
  limit?: number;
  className?: string;
}) {
  const [board, setBoard] = useState(initial);
  useEffect(() => {
    const load = () => getTriviaBoard().then(setBoard).catch(() => {});
    if (refreshKey) load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [refreshKey]);

  const entries = limit ? board.entries.slice(0, limit) : board.entries;
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">Prize pool · {ghs(board.prizeGhs)}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-white">Lenko Trivia Leaderboard</h2>
        </div>
        <p className="text-xs text-neutral-400">
          {board.correct} right answer{board.correct === 1 ? "" : "s"} · {board.rounds} round{board.rounds === 1 ? "" : "s"} · {board.players} player
          {board.players === 1 ? "" : "s"}
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="p-8 text-center text-sm text-neutral-400">No right answers yet — the first winners will show here when their round is over.</p>
      ) : (
        <ol className="divide-y divide-white/[0.05]">
          {entries.map((e, i) => (
            <li key={`${e.round}-${e.name}-${i}`} className="flex items-center gap-3 px-5 py-3">
              <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-sm text-emerald-300">
                ✓
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{e.name}</p>
                <p className="text-xs text-neutral-400">
                  Round {e.round}
                  {e.seconds !== null && ` · answered in ${e.seconds}s`}
                </p>
              </div>
              <span className="shrink-0 text-xs text-neutral-500">{when(e.at)}</span>
            </li>
          ))}
        </ol>
      )}
      {limit && board.entries.length > limit && (
        <a href="/games/lenko-trivia/leaderboard" className="block border-t border-white/[0.06] p-4 text-center text-sm font-semibold text-accent-soft hover:text-white">
          See all {board.entries.length} →
        </a>
      )}
    </div>
  );
}
