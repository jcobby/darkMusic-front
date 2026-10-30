"use client";

import Link from "next/link";
import type { SaveState } from "./useScoreSaver";
import { monthlyPrize } from "@/config/site";

const n = (v: number) => v.toLocaleString();
const place = (s: Extract<SaveState, { s: "live" }>) =>
  s.rank ? `#${s.rank}${s.total ? ` of ${s.total}` : ""}` : null;

/** Where "Sign in" sends a player: back to this game afterwards. */
export const signInHref = (game: string) => `/account?next=${encodeURIComponent(`/games/${game}`)}`;

/**
 * The line under the score while playing: whether this game is counting for the
 * leaderboard, and what's been saved so far. Always the same height, so the
 * board never jumps.
 */
export function SaveBar({ save, game, onRetry }: { save: SaveState; game: string; onRetry: () => void }) {
  const signIn = (
    <Link href={signInHref(game)} className="ml-1 font-bold text-white underline">
      Sign in
    </Link>
  );
  let tone = "text-neutral-400";
  let body: React.ReactNode = null;
  switch (save.s) {
    case "guest":
      tone = "text-yellow-300";
      body = <>⚠ Not signed in — this game won&apos;t count.{signIn}</>;
      break;
    case "signin":
      tone = "text-yellow-300";
      body = <>⚠ Sign-in expired — this game won&apos;t count.{signIn}</>;
      break;
    case "connecting":
      body = save.slow ? "⏳ Still connecting — your score saves once it's through…" : "⏳ Connecting to the leaderboard…";
      break;
    case "live": {
      tone = "text-emerald-300";
      const where = place(save);
      const thisIsBest = save.best === null || save.saved >= save.best;
      const streak = save.day && save.day.streak > 1 ? ` · 🔥${save.day.streak}` : "";
      body =
        save.saved === 0 ? (
          <>● Counting for the leaderboard — saves as you play</>
        ) : save.rules === "daily" ? (
          // Each day's best game is what counts
          <>
            ✓ Saved {n(save.saved)}
            {thisIsBest ? " · best today" : ` · today's best ${n(save.best!)}`}
            {streak}
            {where && ` · ${where}`}
            {save.saving && <span className="text-neutral-400"> · saving…</span>}
          </>
        ) : (
          <>
            ✓ Saved {n(save.saved)}
            {where && (thisIsBest ? ` · rank ${where}` : ` · your best ${n(save.best!)} is ${where}`)}
            {save.saving && <span className="text-neutral-400"> · saving…</span>}
          </>
        );
      break;
    }
    case "offline":
      tone = "text-yellow-300";
      body = (
        <>
          ⚠ Not saving — no connection{save.saved ? ` (saved ${n(save.saved)})` : ""}.
          <button type="button" onClick={onRetry} className="ml-1 font-bold text-white underline">
            Retry
          </button>
        </>
      );
      break;
    case "busy":
      tone = "text-yellow-300";
      body = <>⏳ Busy — saving again in a moment{save.saved ? ` (saved ${n(save.saved)})` : ""}</>;
      break;
    case "rejected":
      tone = "text-red-400";
      body = <>⚠ {save.message}</>;
      break;
  }
  return (
    <p role="status" aria-live="polite" className={`mb-2 flex h-5 items-center justify-center truncate px-1 text-[11px] font-semibold sm:text-xs ${tone}`}>
      {body}
    </p>
  );
}

/**
 * Shown over the board when the game pauses because the score stopped saving:
 * what's wrong and what to do, before playing on.
 */
export function SavePause({
  save,
  game,
  onRetry,
  onContinue,
  onNewGame,
}: {
  save: SaveState;
  game: string;
  onRetry: () => void;
  onContinue: () => void;
  onNewGame: () => void;
}) {
  if (save.s === "live") {
    return (
      <div className="text-center">
        <p className="font-display text-2xl font-bold text-emerald-300">✓ Back online</p>
        <p className="mt-2 text-sm text-neutral-300">Your score is saving again{save.saved ? ` — ${n(save.saved)} saved` : ""}.</p>
        <button type="button" onClick={onContinue} className="btn-accent mt-4 min-h-[48px] w-full max-w-[14rem]">
          ▶ Continue
        </button>
      </div>
    );
  }
  const reason =
    save.s === "signin"
      ? "Your sign-in has expired, so this game can't go on the leaderboard."
      : save.s === "rejected"
        ? `${save.message}.`
        : `We can't reach the leaderboard — check your internet connection.${
            save.s === "offline" && save.saved ? ` Saved so far: ${n(save.saved)}.` : ""
          }`;
  return (
    <div className="text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-yellow-400">Game paused</p>
      <p className="mt-2 font-display text-2xl font-bold text-white">⚠ Your score isn&apos;t being saved</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-neutral-300">{reason}</p>
      <div className="mt-4 flex flex-col items-center gap-2">
        {save.s === "signin" ? (
          <Link href={signInHref(game)} className="btn-accent min-h-[48px] w-full max-w-[16rem]">
            Sign in again
          </Link>
        ) : save.s === "rejected" ? (
          <button type="button" onClick={onNewGame} className="btn-accent min-h-[48px] w-full max-w-[16rem]">
            Start a new game
          </button>
        ) : (
          <button type="button" onClick={onRetry} className="btn-accent min-h-[48px] w-full max-w-[16rem]">
            Try again
          </button>
        )}
        <button type="button" onClick={onContinue} className="btn-outline min-h-[44px] w-full max-w-[16rem]">
          {save.s === "offline" || save.s === "busy" || save.s === "connecting"
            ? "Keep playing — save when back online"
            : "Keep playing (won't count)"}
        </button>
      </div>
    </div>
  );
}

/** The game-over line about the leaderboard: saved (and where they stand), or why not. */
export function SaveResult({
  save,
  score,
  game,
  onRetry,
}: {
  save: SaveState;
  score: number;
  game: string;
  onRetry: () => void;
}) {
  if (score <= 0) return null;
  switch (save.s) {
    case "guest":
      return (
        <p className="mt-2 text-sm text-yellow-200">
          This score wasn&apos;t saved — you&apos;re not signed in.{" "}
          <Link href={signInHref(game)} className="font-semibold text-accent underline">
            Sign in
          </Link>{" "}
          to compete for DMY Fan Rewards — {monthlyPrize} every month.
        </p>
      );
    case "signin":
      return (
        <p className="mt-2 text-sm text-yellow-200">
          ⚠ Not saved — your sign-in expired.{" "}
          <Link href={signInHref(game)} className="font-semibold text-accent underline">
            Sign in again
          </Link>
        </p>
      );
    case "rejected":
      return <p className="mt-2 text-sm text-red-400">⚠ Not saved: {save.message}</p>;
    case "offline":
    case "busy":
      return (
        <p className="mt-2 text-sm text-yellow-200">
          ⚠ Not saved yet{save.saved ? ` (${n(save.saved)} saved during the game)` : ""} — can&apos;t reach the
          leaderboard. We&apos;ll keep trying, and again next time you open this game.{" "}
          <button type="button" onClick={onRetry} className="font-semibold text-accent underline">
            Try now
          </button>
        </p>
      );
    case "live": {
      if (save.saving || save.saved < score) return <p className="mt-2 text-sm text-neutral-400">Saving your score…</p>;
      const result = <SavedResult save={save} />;
      if (!save.sprint) return result;
      // A sprint: where it landed on today's sprint board, as well as the month
      const sp = save.sprint;
      return (
        <>
          <p className="mt-2 text-sm text-yellow-100">
            ⏱ {sp.newBest ? "Your best sprint today! " : ""}Today&apos;s sprint board: {sp.rank ? <b className="text-white">#{sp.rank}</b> : "—"} of {n(sp.total)}
            {!sp.newBest && <> · your best today {n(sp.best)}</>}.{" "}
            <Link href="/games/leaderboard?board=sprint" className="text-accent underline">
              Sprint board
            </Link>
          </p>
          {result}
        </>
      );
    }
    default:
      return <p className="mt-2 text-sm text-neutral-400">Saving your score…</p>;
  }
}

/** A saved game's line about the month's board (the day's best under the daily rules). */
function SavedResult({ save }: { save: Extract<SaveState, { s: "live" }> }) {
  const board = (
    <Link href="/games/leaderboard" className="text-accent underline">
      See the board
    </Link>
  );
  const where = place(save);
  if (save.rules === "daily" && save.day) {
    const d = save.day;
    const month = (
      <>
        {" "}
        Month total <b className="text-white">{n(save.monthPoints ?? 0)}</b>
        {where && ` · rank ${where}`}. {board}
      </>
    );
    return save.saved >= d.best ? (
      <p className="mt-2 text-sm text-neutral-200">
        <span className="font-semibold text-emerald-300">✓ Your best game today — saved!</span> Today counts for{" "}
        <b className="text-white">{n(d.points)}</b> pts
        {d.streak > 1 && ` (🔥 ${d.streak} days in a row: +${d.bonusPct}%)`}.{month}
      </p>
    ) : (
      <p className="mt-2 text-sm text-neutral-300">
        <span className="font-semibold text-emerald-300">✓ Saved.</span> Your best today is still <b className="text-white">{n(d.best)}</b> —
        each day&apos;s best game counts.{month}
      </p>
    );
  }
  return save.newBest || save.best === null || save.saved >= save.best ? (
    <p className="mt-2 text-sm font-semibold text-emerald-300">
      ✓ {save.newBest ? "New monthly best — saved!" : "Saved to the leaderboard."}
      {where && ` Rank ${where}.`} {board}
    </p>
  ) : (
    <p className="mt-2 text-sm text-neutral-300">
      <span className="font-semibold text-emerald-300">✓ Saved.</span> Your best this month is still{" "}
      <b className="text-white">{n(save.best)}</b>
      {where && ` (rank ${where})`} — this game didn&apos;t beat it. {board}
    </p>
  );
}
