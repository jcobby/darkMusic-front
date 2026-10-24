"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getLeaderboard, type Leaderboard, type LeaderboardRow } from "@/lib/api";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { PrizePool } from "./PrizePool";
import { PrizeWallet } from "./PrizeWallet";
import { EventsStrip } from "./Events";
import { BoardRow, PRIZE_GAME, PrizeRules, YourPosition, monthName, thisWeek, timeLeft, weekName } from "./LeaderboardParts";

const PAGE = 50;

// Worked out at fetch time (not while rendering) so server and browser markup always match.
const lastMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
};
type Tab = "current" | "week" | "sprint" | "lastWeek" | "last";
const today = () => new Date().toISOString().slice(0, 10);
const queryFor = (t: Tab): { month?: string; week?: string; sprint?: string } =>
  t === "last"
    ? { month: lastMonth() }
    : t === "week"
      ? { week: thisWeek() }
      : t === "lastWeek"
        ? { week: thisWeek(1) }
        : t === "sprint"
          ? { sprint: today() }
          : {};
const TABS: { key: Tab; label: string }[] = [
  { key: "current", label: "This month" },
  { key: "week", label: "This week" },
  { key: "sprint", label: "⏱ Sprint today" },
  { key: "lastWeek", label: "Last week" },
  { key: "last", label: "Last month" },
];

/** "Saturday 24 October" for a YYYY-MM-DD day. */
const dayName = (day: string) =>
  day ? new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "";
const firstDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** The Beat Breaker boards: this month or last (the prize), this week or last, today's sprints — 50 players at a time, with your own position on top. */
export function FullLeaderboard() {
  const { user } = useFanAuth();
  const [tab, setTab] = useState<Tab>("current");
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  // Opened from a sprint's game over (?board=sprint) → the sprint board
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("board") === "sprint") setTab("sprint");
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    getLeaderboard(PRIZE_GAME, getFanToken(), { ...queryFor(tab), limit: PAGE }).then((b) => {
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
    const b = await getLeaderboard(PRIZE_GAME, getFanToken(), {
      ...(board.period === "sprint" ? { sprint: board.day } : board.period === "week" ? { week: board.week } : { month: board.month }),
      offset: rows.length,
      limit: PAGE,
    });
    if (b) setRows((r) => [...r, ...b.top.filter((x) => x.rank > r.length)]);
    setMore(false);
  }, [board, rows.length]);

  const week = board?.period === "week";
  const sprint = board?.period === "sprint";
  const bragging = week || sprint; // no prize: a badge for the winner
  // Weekly boards begin with the new season's first Monday
  const weeklyFrom = board?.scoring?.weeklyFrom;
  const notStarted = Boolean(week && weeklyFrom && (board?.week ?? "") < weeklyFrom);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* The money, in the open — then the player's own wallet if they've won */}
      <PrizePool />
      <PrizeWallet />
      <EventsStrip />

      {/* Board switch */}
      <div className="flex flex-wrap gap-2" role="tablist">
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
          {/* Summary: the prize (months) or the week's badge */}
          <div className="card overflow-hidden">
            <div className={`bg-gradient-to-r ${bragging ? "from-yellow-400/15" : "from-accent-deep/60"} to-transparent p-5`}>
              <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${bragging ? "text-yellow-400" : "text-accent"}`}>
                {sprint ? `Daily sprint · ${dayName(board.day ?? "")}` : week ? weekName(board.week ?? "") : monthName(board.month)}
              </p>
              {sprint ? (
                <>
                  <p className="mt-1 font-display text-2xl font-bold text-white">⏱ Today&apos;s sprint champion</p>
                  <p className="mt-1 text-sm text-neutral-300">
                    Your best {board.sprintMinutes ?? 15}-minute sprint today counts — start one from Beat Breaker&apos;s start screen. A fresh board every
                    day at midnight (Ghana time); the day&apos;s winner gets a ⏱ next to their name on every board.
                  </p>
                </>
              ) : week ? (
                <>
                  <p className="mt-1 font-display text-2xl font-bold text-white">🏅 Champion of the week</p>
                  <p className="mt-1 text-sm text-neutral-300">
                    A fresh board every Monday — each day you play this week adds up. The winner gets a 🏅 next to their name on every board.
                  </p>
                </>
              ) : (
                <p className="mt-1 font-display text-2xl font-bold text-white">
                  🏆 GH₵{board.prizeGhs.toLocaleString()} {board.rules === "daily" ? "for the biggest total" : "for the top score"}
                  {board.funded && (
                    <span className="ml-2 align-middle rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">✓ Deposited</span>
                  )}
                </p>
              )}
              {!notStarted && (
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
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                      {board.ended ? (bragging ? "Champion" : "Winner") : "Leader"}
                    </p>
                    <p className="truncate font-semibold text-white">
                      {board.leader ? `${board.leader.mine ? "You" : board.leader.name} · ${board.leader.score.toLocaleString()}` : "—"}
                    </p>
                  </div>
                </div>
              )}
              {board.ended && board.prize && (
                <p className="mt-3 text-sm text-neutral-200">
                  {board.prize.inReview
                    ? `GH₵${board.prize.amountGhs.toLocaleString()} is in the winner's wallet — score check, then they can withdraw it.`
                    : `GH₵${board.prize.amountGhs.toLocaleString()} went to the winner's wallet ✓`}
                </p>
              )}
            </div>
          </div>

          {notStarted ? (
            <div className="card p-6 text-center text-sm text-neutral-300">
              The first weekly board starts on <b className="text-white">{firstDay(`${weeklyFrom}T00:00:00Z`)}</b>.
            </div>
          ) : (
            <>
              <YourPosition board={board} signedIn={Boolean(user)} />

              {/* The board */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 text-xs text-neutral-400">
                  <span>{board.rules === "daily" ? "Rank · player · days played" : "Rank · player · level"}</span>
                  <span>{board.rules === "daily" ? "Points" : "Score"}</span>
                </div>
                {rows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-neutral-400">
                    {board.ended
                      ? `Nobody played that ${sprint ? "day" : week ? "week" : "month"}.`
                      : sprint
                        ? "No sprints yet today — the top spot is yours to take."
                        : `No scores yet this ${week ? "week" : "month"} — the top spot is yours to take.`}
                  </p>
                ) : (
                  <ol className="divide-y divide-white/[0.04]">
                    {rows.map((r) => (
                      <BoardRow key={r.rank} r={r} winner={board.ended && !bragging} />
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
            </>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/games/beat-breaker" className="btn-accent min-h-[48px]">
              ▶ Play Beat Breaker
            </Link>
            <Link href="/games/squads" className="btn-outline min-h-[44px] text-sm">
              👥 Squad board
            </Link>
            <Link href="/games" className="btn-ghost min-h-[44px] text-sm">
              All games
            </Link>
          </div>

          <div className="card p-5">
            <p className="mb-2 text-sm font-semibold text-white">{board.scoring || sprint ? "How the board works" : "Prize rules"}</p>
            {sprint ? (
              <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-400">
                <li>• Press ⏱ 15-minute sprint on Beat Breaker&apos;s start screen, signed in. You get 15 minutes (or until you run out of lives).</li>
                <li>• Your best sprint of the day is your score here. Play as many as you like — a fresh board every day at midnight, Ghana time.</li>
                <li>• Sprints count for the month&apos;s and the week&apos;s boards too, like any game.</li>
                <li>• The day&apos;s winner gets a ⏱ next to their name on every board. A tie goes to whoever got there first.</li>
              </ul>
            ) : (
              <PrizeRules prizeGhs={bragging ? 0 : board.prizeGhs} scoring={board.scoring} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
