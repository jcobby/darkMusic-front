"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getPoolNight, type PoolNight } from "@/lib/api";
import { site } from "@/config/site";
import { useNow } from "../Events";

const POOL_URL = `${site.url}/games/pool`;
const day = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
/** "1d 3h", "4h 12m", "12:04" */
function until(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}:${String(s % 60).padStart(2, "0")}`;
}
/** Google Calendar: every Thursday, 19:00–22:00 GMT, from this one. */
function calendarLink(n: PoolNight) {
  const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: "DMY Pool Night 🎱",
    dates: `${stamp(n.startsAt)}/${stamp(n.endsAt)}`,
    recur: "RRULE:FREQ=WEEKLY;BYDAY=TH",
    details: `Ranked Pool with the Lenko Army on Dark Music Yard — ${POOL_URL}`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/**
 * DMY Pool Night — every Thursday from 7pm GMT, the Lenko Army plays ranked Pool
 * together. Before it: when, a countdown, share and add-to-calendar. During it: how busy
 * the tables are, "Play ranked now" and the night's board.
 */
export function PoolNightBanner({ onPlay, signedIn }: { onPlay: () => void; signedIn: boolean }) {
  const [night, setNight] = useState<PoolNight | null>(null);
  const offset = useRef(0); // the server's clock − ours
  const now = useNow(1000);

  useEffect(() => {
    let live = true;
    const load = () =>
      getPoolNight()
        .then((n) => {
          if (!live) return;
          offset.current = Date.parse(n.now) - Date.now();
          setNight(n);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  if (!night || night.status === "cancelled" || !now) return null;
  const t = now + offset.current;
  const starts = Date.parse(night.startsAt);
  const ends = Date.parse(night.endsAt);
  if (t >= ends) return null; // just finished — the next one shows on the next look
  const live = t >= starts;
  const tonight = new Date(t).toISOString().slice(0, 10) === night.startsAt.slice(0, 10);
  const share = `🎱 DMY Pool Night — ${tonight ? "tonight" : day(new Date(starts))} from 7pm. Come play ranked Pool with the Lenko Army: ${POOL_URL}`;

  return (
    <div
      className={`card overflow-hidden ${live ? "border-yellow-400/60 shadow-[0_0_28px_rgba(250,204,21,0.15)]" : "border-accent/40"}`}
      aria-live="polite"
    >
      <div className={`p-5 sm:p-6 ${live ? "bg-gradient-to-r from-yellow-400/10 to-transparent" : "bg-gradient-to-r from-accent/15 to-transparent"}`}>
        <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${live ? "text-yellow-400" : "text-accent"}`}>
          {live ? "🔴 Live now" : "Every Thursday · 7pm"}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">🎱 DMY Pool Night</h2>
        {live ? (
          <p className="mt-1 text-sm text-neutral-200">
            The Lenko Army is at the tables until 10pm. <b className="text-white">{night.looking}</b> looking for a match ·{" "}
            <b className="text-white">{night.playing}</b> match{night.playing === 1 ? "" : "es"} on · {night.players} played tonight
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-300">
            {tonight ? "Tonight" : day(new Date(starts))}, 7pm–10pm GMT — starts in <b className="tabular-nums text-white">{until(starts - t)}</b>. Play
            ranked with the Lenko Army: every ranked match you start that night counts for the night&apos;s board.
          </p>
        )}
        {night.prizeGhs > 0 && <p className="mt-2 text-sm font-semibold text-yellow-300">🏆 GH₵{night.prizeGhs.toLocaleString()} for the night&apos;s top players</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {live &&
            (signedIn ? (
              <button type="button" onClick={onPlay} className="btn-accent min-h-[48px]">
                🎱 Play ranked now
              </button>
            ) : (
              <Link href="/account?next=%2Fgames%2Fpool" className="btn-accent min-h-[48px]">
                Sign in to play
              </Link>
            ))}
          {live && night.slug && (
            <Link href={`/games/events/${night.slug}`} className="btn-outline min-h-[48px]">
              Tonight&apos;s board →
            </Link>
          )}
          {!live && (
            <>
              <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[44px] text-sm">
                Tell the LA on WhatsApp
              </a>
              <a href={calendarLink(night)} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[44px] text-sm">
                📅 Add to calendar
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
