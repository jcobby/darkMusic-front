"use client";

import Link from "next/link";
import type { BoardScoring, BoardToday, Leaderboard, LeaderboardRow } from "@/lib/api";
import { FanName } from "../FanName";

export const PRIZE_GAME = "beat-breaker";

export const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** "Week of 2 Nov" (a week is named by its Monday). */
export const weekName = (week: string) =>
  `Week of ${new Date(`${week}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;

/** This week's Monday (UTC), "YYYY-MM-DD" — worked out at fetch time, never while rendering. */
export function thisWeek(weeksAgo = 0) {
  const d = new Date();
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ((d.getUTCDay() + 6) % 7) * 86400000;
  return new Date(monday - weeksAgo * 7 * 86400000).toISOString().slice(0, 10);
}

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
  const name = (
    <>
      <FanName name={r.mine ? <b>You</b> : r.name} flair={r.flair} />
      {/* Their 🏆 badge already counts this month once the prize is theirs */}
      {winner && r.rank === 1 && !r.flair?.months && <span className="ml-1.5">🏆</span>}
    </>
  );
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
      {r.days !== null ? (
        // Daily rules: the total is the score; days played and the best game show how it was earned
        <span className="min-w-0 flex-1">
          <span className="block truncate text-white">{name}</span>
          <span className="block truncate text-xs text-neutral-500">
            {r.days} day{r.days === 1 ? "" : "s"} · best game {pts(r.bestRun ?? 0)} · lvl {r.level}
          </span>
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate text-white">
          {name}
          {r.level > 0 && <span className="ml-2 text-xs text-neutral-500">lvl {r.level}</span>}
        </span>
      )}
      <span className="font-semibold tabular-nums text-white">{pts(r.score)}</span>
    </li>
  );
}

/** The signed-in fan's streak and what today's best game is (or would be) worth. */
export function StreakNote({ today, scoring, className = "" }: { today: BoardToday | null; scoring: BoardScoring | null; className?: string }) {
  if (!today || !scoring) return null;
  let body: React.ReactNode;
  if (today.played) {
    body =
      today.streak > 1 ? (
        <>
          🔥 <b>{today.streak} days in a row</b> — today&apos;s best game ({pts(today.best)}) counts for <b>{pts(today.points)}</b> pts
          (+{today.bonusPct}%).
        </>
      ) : (
        <>
          ✓ Today&apos;s best game: <b>{pts(today.best)}</b>. Play again tomorrow to start a streak — +{scoring.streakStepPct}% a day.
        </>
      );
  } else if (today.streak > 0) {
    body = (
      <>
        🔥 <b>{today.streak}-day streak</b> — play today to keep it: today&apos;s best game gets <b>+{today.bonusPct}%</b>.
      </>
    );
  } else {
    body = <>Play today — your best game adds a day to your total. Play days in a row for up to +{scoring.streakMaxPct}%.</>;
  }
  return <p className={`rounded-xl border border-yellow-400/30 bg-yellow-400/[0.07] px-3 py-2 text-sm text-neutral-100 ${className}`}>{body}</p>;
}

/**
 * Where the signed-in fan stands: rank out of everyone, how far to the next place
 * and to first, and the players just above and below them.
 */
export function YourPosition({ board, signedIn }: { board: Leaderboard; signedIn: boolean }) {
  const me = board.me;
  const week = board.period === "week";
  const sprint = board.period === "sprint";
  const daily = board.rules === "daily";
  if (!signedIn) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold text-white">Where are you on the board?</p>
          <p className="text-sm text-neutral-400">
            {daily ? "Sign in, play Beat Breaker and every day you play adds up here." : "Sign in, play Beat Breaker and your best score lands here."}
          </p>
        </div>
        <Link href="/account" className="btn-accent min-h-[44px] text-sm">
          Sign in to compete
        </Link>
      </div>
    );
  }
  if (!me) {
    return board.ended ? null : (
      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-white">You&apos;re not on the board yet</p>
            <p className="text-sm text-neutral-400">
              {sprint
                ? "Play a 15-minute sprint today — your best one counts."
                : !daily
                ? "Play Beat Breaker — your best score this month counts."
                : week
                  ? "Play this week — your best game each day adds up."
                  : "Play Beat Breaker — your best game each day adds up to your month."}
            </p>
          </div>
          <Link href="/games/beat-breaker" className="btn-accent min-h-[44px] text-sm">
            Play now
          </Link>
        </div>
        <StreakNote today={board.today} scoring={board.scoring} />
      </div>
    );
  }
  if (me.disqualified || me.rank === null) {
    return (
      <div className="card p-5 text-sm text-neutral-300">
        Your score for {sprint ? "that day's sprint" : week ? weekName(board.week ?? "") : monthName(board.month)} was removed from the board after DMY&apos;s review.
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
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Your position{sprint ? " today" : week ? " this week" : ""}</p>
          <p className="mt-1 font-display text-3xl font-bold text-white">
            #{me.rank}
            <span className="ml-2 text-base font-semibold text-neutral-400">of {pts(board.total)}</span>
          </p>
        </div>
        <p className="text-right text-sm text-neutral-300">
          {me.days !== null ? (
            <>
              <b className="text-white">{pts(me.score)}</b> pts · {me.days} day{me.days === 1 ? "" : "s"}
              <span className="block text-xs text-neutral-400">best game {pts(me.bestRun ?? 0)} · level {me.level}</span>
            </>
          ) : (
            <>
              Best <b className="text-white">{pts(me.score)}</b> · level {me.level}
            </>
          )}
        </p>
      </div>
      <p className="px-5 pt-4 text-sm text-white">
        {first ? (
          sprint ? (
            board.ended ? (
              <>⏱ You won the day&apos;s sprint — the badge is next to your name on every board.</>
            ) : (
              <>⏱ You&apos;re top of today&apos;s sprint board — hold on until midnight to win it.</>
            )
          ) : week ? (
            board.ended ? (
              <>🏅 You won the week — the badge is next to your name on every board.</>
            ) : (
              <>🏅 You&apos;re top of the week — hold on until Sunday midnight to win it.</>
            )
          ) : board.ended ? (
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
      {!board.ended && <StreakNote today={board.today} scoring={board.scoring} className="mx-5 mt-3" />}
      <ol className="mt-3 divide-y divide-white/[0.04] border-t border-white/[0.06]">
        {me.around.map((r) => (
          <BoardRow key={r.rank} r={r} winner={board.ended && !week && !sprint} />
        ))}
      </ol>
    </div>
  );
}

export function PrizeRules({ prizeGhs, scoring }: { prizeGhs: number; scoring: BoardScoring | null }) {
  return (
    <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-400">
      {scoring ? (
        <>
          <li>
            • Only Beat Breaker counts. Play while signed in — every game is checked, and your <b className="text-neutral-200">best game each day</b>{" "}
            (Ghana time) is that day&apos;s score. A game counts for the day it started.
          </li>
          <li>
            • 🔥 Days in a row add {scoring.streakStepPct}% each to that day&apos;s score, up to +{scoring.streakMaxPct}%. Miss a day and the streak
            starts again.
          </li>
          <li>
            • Your <b className="text-neutral-200">best {scoring.bestDays} days</b> add up to your month total — so missing a few days won&apos;t knock you
            out. The biggest total at 23:59 GMT on the last day of the month wins the prize pool{prizeGhs > 0 && ` (GH₵${pts(prizeGhs)})`}. A tie
            goes to whoever reached it first.
          </li>
          <li>• ⚡ Levels after 21 are overtime — faster every level — so skill, not hours, decides how far a game goes.</li>
          <li>• 🏅 Every week (Monday–Sunday) has its own board, where each day you play adds up. The week&apos;s winner gets a 🏅 next to their name on every board.</li>
        </>
      ) : (
        <>
          <li>• Only Beat Breaker counts. Play while signed in — each finished game is checked and your best score of the month is kept.</li>
          <li>• The highest score at 23:59 GMT on the last day of the month wins the pool (GH₵{prizeGhs}). A tie goes to whoever reached it first.</li>
        </>
      )}
      <li>• DMY deposits the prize into the pool through Paystack — every deposit is shown, with its reference.</li>
      <li>• The prize goes straight into the winner&apos;s DMY wallet. After a 48-hour score check they withdraw it to Mobile Money and Paystack sends it.</li>
      <li>• One account per person. Cheating or automated play is disqualified, and the prize moves to the next player.</li>
    </ul>
  );
}
