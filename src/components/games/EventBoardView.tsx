"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getGameEvent, type GameEventBoard, type LeaderboardRow } from "@/lib/api";
import { eventGhs, eventTime, gameName, gamePath, kindLabel, placeName, prizeLine, scoringLine } from "@/lib/events";
import { site } from "@/config/site";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { BoardRow } from "./LeaderboardParts";
import { EventTiming, liveStatus, useNow } from "./Events";

const PAGE = 50;

/**
 * An event's page: when it runs, what it pays, how it's scored, its board (with the
 * signed-in fan's own place) and, once it's over, the winners. Refreshes every 30 s while live.
 */
export function EventBoardView({ initial }: { initial: GameEventBoard }) {
  const { user } = useFanAuth();
  const [data, setData] = useState(initial);
  const [rows, setRows] = useState<LeaderboardRow[]>(initial.top);
  const [more, setMore] = useState(false);
  const now = useNow(5000);
  const ev = data.event;
  const status = liveStatus(ev, now);

  const load = useCallback(async () => {
    const d = await getGameEvent(ev.slug, getFanToken(), { limit: PAGE });
    if (d) {
      setData(d);
      setRows(d.top);
    }
  }, [ev.slug]);
  useEffect(() => {
    void load(); // again with the fan's sign-in, for their own place
  }, [load, user?.id]);
  useEffect(() => {
    if (status !== "live") return;
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [status, load]);

  async function loadMore() {
    setMore(true);
    const d = await getGameEvent(ev.slug, getFanToken(), { offset: rows.length, limit: PAGE });
    if (d) setRows((r) => [...r, ...d.top.filter((x) => x.rank > r.length)]);
    setMore(false);
  }

  const me = data.me;
  const share = `https://twitter.com/intent/tweet?${new URLSearchParams({
    text: `⚡ ${ev.title} — ${gameName(ev)} on Dark Music Yard. ${prizeLine(ev)}. ${eventTime(ev.startsAt)} (GMT).`,
    url: `${site.url}/games/events/${ev.slug}`,
  })}`;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* The event */}
      <div className={`card overflow-hidden ${status === "live" ? "ring-1 ring-yellow-400/60" : ""}`}>
        <div className="bg-gradient-to-r from-yellow-400/15 to-transparent p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">
            {status === "live" ? "⚡ Live now" : status === "upcoming" ? `⚡ ${kindLabel(ev)} · coming up` : status === "cancelled" ? "Cancelled" : `${kindLabel(ev)} · ended`}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white text-balance">{ev.title}</h1>
          <p className="mt-1 text-sm text-neutral-300">
            {eventTime(ev.startsAt)} → {eventTime(ev.endsAt)} · Ghana time
          </p>
          {ev.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-200">{ev.description}</p>}
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">{status === "upcoming" ? "Starts" : status === "live" ? "Time left" : "Status"}</p>
              <EventTiming event={ev} bare className="font-semibold text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Players</p>
              <p className="font-semibold text-white">{data.total.toLocaleString()}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">{status === "ended" ? "Winner" : "Leader"}</p>
              <p className="truncate font-semibold text-white">
                {data.leader ? `${data.leader.mine ? "You" : data.leader.name} · ${data.leader.score.toLocaleString()}` : "—"}
              </p>
            </div>
          </div>
          <p className="mt-4 font-semibold text-white">💰 {prizeLine(ev)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(status === "live" || status === "upcoming") && (
              <Link href={gamePath(ev)} className="btn-accent min-h-[48px]">
                ▶ {status === "live" ? "Play now — it counts" : "Practise now"}
              </Link>
            )}
            <a href={share} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[48px]">
              Share on X
            </a>
          </div>
        </div>
      </div>

      {/* Results */}
      {status === "ended" && ev.winners.length > 0 && (
        <div className="card p-5">
          <p className="mb-2 text-sm font-semibold text-white">🏆 Results</p>
          <ol className="space-y-1.5 text-sm">
            {ev.winners
              .filter((w) => w.amountGhs > 0 || w.place <= 3)
              .map((w) => (
                <li key={w.place} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-white">
                    <b>{placeName(w.place)}</b> · {w.name} · {w.score.toLocaleString()} {ev.metric === "wins" ? "wins" : "pts"}
                  </span>
                  {w.amountGhs > 0 && <span className="shrink-0 font-semibold text-emerald-300">{eventGhs(w.amountGhs)}</span>}
                </li>
              ))}
          </ol>
          <p className="mt-2 text-xs text-neutral-500">Prizes are in the winners&apos; DMY wallets — withdrawable to Mobile Money after the 48-hour score check.</p>
        </div>
      )}

      {/* Where you stand */}
      {user && me && (
        <div className="card p-5 text-sm text-white">
          {me.rank === null ? (
            <>Your entry was removed after DMY&apos;s review.</>
          ) : (
            <>
              You&apos;re <b>#{me.rank}</b> of {data.total.toLocaleString()} with <b>{me.score.toLocaleString()}</b> {ev.metric === "wins" ? "wins" : "pts"}
              {ev.prizes[me.rank - 1] ? (
                <>
                  {" "}
                  — {status === "ended" ? "you won" : "worth"} <b className="text-emerald-300">{eventGhs(ev.prizes[me.rank - 1])}</b>
                  {status === "ended" ? "" : " if it ends now"}
                </>
              ) : null}
              .
            </>
          )}
        </div>
      )}
      {!user && status !== "ended" && status !== "cancelled" && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-neutral-300">Sign in so your games count for {ev.title}.</p>
          <Link href={`/account?next=${encodeURIComponent(`/games/events/${ev.slug}`)}`} className="btn-accent min-h-[44px] text-sm">
            Sign in to enter
          </Link>
        </div>
      )}

      {/* The board */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 text-xs text-neutral-400">
          <span>{ev.metric === "wins" ? "Rank · player" : ev.metric === "days" ? "Rank · player · days played" : "Rank · player · level"}</span>
          <span>{ev.metric === "wins" ? "Wins" : "Points"}</span>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-400">
            {status === "upcoming" ? "The board opens when the event starts." : status === "live" ? "No scores yet — the top spot is yours to take." : "Nobody played."}
          </p>
        ) : (
          <ol className="divide-y divide-white/[0.04]">
            {rows.map((r) => (
              <BoardRow key={r.rank} r={r} />
            ))}
          </ol>
        )}
        {rows.length < data.total && (
          <div className="border-t border-white/[0.06] px-5 py-3 text-right">
            <button type="button" onClick={loadMore} disabled={more} className="btn-outline min-h-[44px] text-sm">
              {more ? "Loading…" : `Show ${Math.min(PAGE, data.total - rows.length)} more`}
            </button>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="card p-5">
        <p className="mb-2 text-sm font-semibold text-white">How it works</p>
        <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-400">
          {ev.metric === "wins" ? (
            <>
              <li>
                • Play <b className="text-neutral-200">ranked</b> DMY Pool matches signed in. Matches that start after {eventTime(ev.startsAt)} and finish before it
                ends ({eventTime(ev.endsAt)}, Ghana time) count — every win is a point.
              </li>
              <li>• Friend challenges don&apos;t count. A tie goes to whoever got to that many wins first.</li>
            </>
          ) : (
            <>
              <li>
                • Play Beat Breaker signed in. Only games you <b className="text-neutral-200">start after {eventTime(ev.startsAt)}</b> count — start a new
                game once it&apos;s live.
              </li>
              <li>• Everything you score before it ends ({eventTime(ev.endsAt)}, Ghana time) counts. {scoringLine(ev)}.</li>
              <li>• Your games still count for the month&apos;s and the week&apos;s boards too.</li>
            </>
          )}
          <li>
            • {prizeLine(ev)}. Prizes go into the winners&apos; DMY wallets when it ends; after a 48-hour score check they withdraw to Mobile Money. A tie
            goes to whoever got there first. If fewer players finish than there are paid places, the rest isn&apos;t paid out.
          </li>
          <li>• One account per person. Cheating or automated play is disqualified, and the prize moves to the next player.</li>
        </ul>
      </div>
    </div>
  );
}
