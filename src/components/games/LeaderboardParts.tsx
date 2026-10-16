"use client";

import Link from "next/link";
import type { Leaderboard, LeaderboardRow } from "@/lib/api";

export const PRIZE_GAME = "beat-breaker";

export const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export function timeLeft(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

const pts = (n: number) => n.toLocaleString("en-US");

/** One player on the board; the signed-in fan's own row is highlighted. */
export function BoardRow({ r, winner = false }: { r: LeaderboardRow; winner?: boolean }) {
  return (
    <li
      className={`flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5 ${
        r.mine ? "bg-accent/15 ring-1 ring-inset ring-accent/50" : ""
      }`}
    >
      <span
        className={`grid h-7 min-w-[1.75rem] shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
          r.rank === 1 ? "bg-accent text-white" : r.rank <= 3 ? "bg-white/15 text-white" : "bg-white/5 text-neutral-300"
        }`}
      >
        {r.rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-white">
        {r.mine ? <b>You</b> : r.name}
        {winner && r.rank === 1 && <span className="ml-1.5">🏆</span>}
        <span className="ml-2 text-xs text-neutral-500">lvl {r.level}</span>
      </span>
      <span className="font-semibold tabular-nums text-white">{pts(r.score)}</span>
    </li>
  );
}

/**
 * Where the signed-in fan stands: rank out of everyone, how far to the next place
 * and to first, and the players just above and below them.
 */
export function YourPosition({ board, signedIn }: { board: Leaderboard; signedIn: boolean }) {
  const me = board.me;
  if (!signedIn) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold text-white">Where are you on the board?</p>
          <p className="text-sm text-neutral-400">Sign in, play Beat Breaker and your best score lands here.</p>
        </div>
        <Link href="/account" className="btn-accent min-h-[44px] text-sm">
          Sign in to compete
        </Link>
      </div>
    );
  }
  if (!me) {
    return board.ended ? null : (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold text-white">You&apos;re not on the board yet</p>
          <p className="text-sm text-neutral-400">Play Beat Breaker — your best score this month counts.</p>
        </div>
        <Link href="/games/beat-breaker" className="btn-accent min-h-[44px] text-sm">
          Play now
        </Link>
      </div>
    );
  }
  if (me.disqualified || me.rank === null) {
    return (
      <div className="card p-5 text-sm text-neutral-300">
        Your score for {monthName(board.month)} was removed from the board after DMY&apos;s review.
      </div>
    );
  }

  const above = me.around.find((r) => r.rank === me.rank! - 1);
  const leader = board.leader;
  const first = me.rank === 1;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Your position</p>
          <p className="mt-1 font-display text-3xl font-bold text-white">
            #{me.rank}
            <span className="ml-2 text-base font-semibold text-neutral-400">of {pts(board.total)}</span>
          </p>
        </div>
        <p className="text-right text-sm text-neutral-300">
          Best <b className="text-white">{pts(me.score)}</b> · level {me.level}
        </p>
      </div>
      <p className="px-5 pt-4 text-sm text-white">
        {first ? (
          board.ended ? (
            <>
              🏆 You finished first — GH₵{pts(board.prizeGhs)} is in your{" "}
              <Link href="/account#wallet" className="font-semibold text-yellow-300 underline">
                DMY wallet
              </Link>
              !
            </>
          ) : (
            <>🏆 You&apos;re in first place — hold on until the month ends to win GH₵{pts(board.prizeGhs)}.</>
          )
        ) : board.ended ? (
          <>You finished #{me.rank}.</>
        ) : (
          <>
            {above && (
              <>
                <b>{pts(above.score - me.score + 1)}</b> points to pass {above.name} (#{above.rank}).{" "}
              </>
            )}
            {leader && me.rank > 2 && (
              <>
                <b>{pts(leader.score - me.score + 1)}</b> points to take first place.
              </>
            )}
          </>
        )}
      </p>
      <ol className="mt-3 divide-y divide-white/[0.04] border-t border-white/[0.06]">
        {me.around.map((r) => (
          <BoardRow key={r.rank} r={r} winner={board.ended} />
        ))}
      </ol>
    </div>
  );
}

export function PrizeRules({ prizeGhs }: { prizeGhs: number }) {
  return (
    <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-400">
      <li>• Only Beat Breaker counts. Play while signed in — each finished game is checked and your best score of the month is kept.</li>
      <li>• DMY deposits the prize into the pool through Paystack — every deposit is shown, with its reference.</li>
      <li>• The highest score at 23:59 GMT on the last day of the month wins the pool (GH₵{prizeGhs}). A tie goes to whoever reached it first.</li>
      <li>• The prize goes straight into the winner&apos;s DMY wallet. After a 48-hour score check they withdraw it to Mobile Money and Paystack sends it.</li>
      <li>• One account per person. Cheating or automated play is disqualified, and the prize moves to the next player.</li>
    </ul>
  );
}
