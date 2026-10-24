"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGameEvents, type GameEventInfo } from "@/lib/api";
import { eventTime, kindLabel, prizeLine, scoringLine } from "@/lib/events";
import { left } from "../AuctionCountdown";

/** The time now, ticking every second — null until mounted (so server and browser markup match). */
export function useNow(everyMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

/** Upcoming / live / ended, worked out from the clock (the event may have started since it loaded). */
export function liveStatus(ev: GameEventInfo, now: number | null): GameEventInfo["status"] {
  if (ev.status === "cancelled" || now === null) return ev.status;
  return now < Date.parse(ev.startsAt) ? "upcoming" : now < Date.parse(ev.endsAt) ? "live" : "ended";
}

/** "Starts in 01:05:09" · "Ends in 42:10" · "Ended" (`bare`: just the time, under a label that says which). */
export function EventTiming({ event, className = "", bare = false }: { event: GameEventInfo; className?: string; bare?: boolean }) {
  const now = useNow();
  const status = liveStatus(event, now);
  if (now === null) return <span className={className}>{eventTime(event.startsAt)}</span>;
  if (status === "cancelled") return <span className={className}>Cancelled</span>;
  if (status === "ended") return <span className={className}>Ended {eventTime(event.endsAt)}</span>;
  const to = status === "upcoming" ? Date.parse(event.startsAt) : Date.parse(event.endsAt);
  return (
    <span className={className}>
      {!bare && (status === "upcoming" ? "Starts in " : "Ends in ")}
      <span className="font-semibold tabular-nums">{left(to - now)}</span>
    </span>
  );
}

/** One event, linking to its page. */
export function EventCard({ event, className = "" }: { event: GameEventInfo; className?: string }) {
  const now = useNow(30_000);
  const live = liveStatus(event, now) === "live";
  return (
    <Link
      href={`/games/events/${event.slug}`}
      className={`group flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border p-4 transition sm:px-5 ${
        live ? "border-yellow-400/60 bg-yellow-400/[0.07] hover:border-yellow-400" : "border-white/10 bg-ink-800/80 hover:border-accent/60"
      } ${className}`}
    >
      <div className="min-w-0">
        <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${live ? "text-yellow-400" : "text-accent"}`}>
          {live ? "⚡ Live now" : kindLabel(event)} · {scoringLine(event)}
        </p>
        <p className="mt-0.5 truncate font-display text-lg font-bold text-white">{event.title}</p>
        <p className="truncate text-sm text-neutral-300">{prizeLine(event)}</p>
      </div>
      <div className="flex items-center gap-3">
        <EventTiming event={event} className="text-sm text-neutral-300" />
        <span className={`${live ? "btn-accent" : "btn-outline"} min-h-[44px] text-sm`}>
          {live ? "Enter" : "See it"} <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}

/** What's on now and coming up (up to three) for a game. Shows nothing when there are no events. */
export function EventsStrip({ className = "", title = true, game = "beat-breaker" }: { className?: string; title?: boolean; game?: string }) {
  const [events, setEvents] = useState<GameEventInfo[] | null>(null);
  useEffect(() => {
    let live = true;
    getGameEvents(game).then((l) => live && setEvents([...l.live, ...l.upcoming].slice(0, 3)));
    return () => {
      live = false;
    };
  }, [game]);
  if (!events?.length) return null;
  return (
    <div className={className}>
      {title && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">⚡ Events</p>}
      <div className="space-y-2">
        {events.map((e) => (
          <EventCard key={e.slug} event={e} />
        ))}
      </div>
    </div>
  );
}

/**
 * Above the game: the live event (or the next one today), with a countdown — and,
 * mid-game, a warning when this game started before the event did, so it won't count.
 */
export function GameEventBanner({ gameStartedAt }: { gameStartedAt: number | null }) {
  const [events, setEvents] = useState<GameEventInfo[]>([]);
  const now = useNow();
  useEffect(() => {
    let live = true;
    const load = () => getGameEvents().then((l) => live && setEvents([...l.live, ...l.upcoming]));
    void load();
    const id = setInterval(load, 5 * 60_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);
  if (now === null) return null;
  const ev =
    events.find((e) => liveStatus(e, now) === "live") ??
    events.find((e) => liveStatus(e, now) === "upcoming" && Date.parse(e.startsAt) - now < 24 * 3600e3);
  if (!ev) return null;
  const live = liveStatus(ev, now) === "live";
  const tooEarly = live && gameStartedAt !== null && gameStartedAt < Date.parse(ev.startsAt);
  return (
    <Link
      href={`/games/events/${ev.slug}`}
      className={`mx-auto mb-3 block max-w-md rounded-2xl border px-4 py-2.5 text-sm ${
        live ? "border-yellow-400/60 bg-yellow-400/[0.08]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-semibold text-white">
          {live ? "⚡ Live: " : "⚡ Coming up: "}
          {ev.title}
        </span>
        <EventTiming event={ev} className="shrink-0 text-xs text-neutral-300" />
      </span>
      <span className="block truncate text-xs text-neutral-300">
        {tooEarly ? (
          <span className="font-semibold text-yellow-300">⚠ This game started before the event — start a new one to enter</span>
        ) : (
          <>
            {prizeLine(ev)} · {live ? "every game you start now counts" : "games started once it's live count"}
          </>
        )}
      </span>
    </Link>
  );
}
