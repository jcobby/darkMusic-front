"use client";

import { useEffect, useState } from "react";
import { getTriviaSession, type TriviaSession } from "@/lib/api";

/** How far ahead the site starts announcing the exam. */
export const EXAM_HEADS_UP_MS = 3 * 86400e3;

// One look at the session shared by everything on the page (the banner and the menu), refreshed every minute
let cache: { at: number; p: Promise<{ s: TriviaSession; offset: number } | null> } | null = null;
function load() {
  if (!cache || Date.now() - cache.at > 55e3) {
    cache = {
      at: Date.now(),
      p: getTriviaSession()
        .then((s) => ({ s, offset: Date.parse(s.now) - Date.now() }))
        .catch(() => null),
    };
  }
  return cache.p;
}

export interface ExamNow {
  phase: "live" | "soon";
  startsAt: number;
  endsAt: number;
  prizeGhs: number;
  msToStart: number; // 0 once it's live
  msToEnd: number;
}

/**
 * Lenko Army Music Trivia as it stands right now, by the server's clock: "live" while
 * members can start their question, "soon" in the days before — otherwise null.
 * Ticks every second while it's live or under an hour away, every half minute otherwise.
 */
export function useExam(): ExamNow | null {
  const [data, setData] = useState<{ s: TriviaSession; offset: number } | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let live = true;
    const get = () => load().then((d) => live && setData(d));
    void get();
    const id = setInterval(get, 60e3);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const s = data?.s;
  const startsAt = s?.startsAt ? Date.parse(s.startsAt) : NaN;
  const endsAt = s?.endsAt ? Date.parse(s.endsAt) : NaN;
  const t = now + (data?.offset ?? 0);
  const fast = now > 0 && t >= startsAt - 3600e3 && t < endsAt;
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), fast ? 1000 : 30e3);
    return () => clearInterval(id);
  }, [fast]);

  if (!s || !s.open || !now || !Number.isFinite(startsAt) || !Number.isFinite(endsAt) || t >= endsAt) return null;
  if (t >= startsAt) return { phase: "live", startsAt, endsAt, prizeGhs: s.prizeGhs, msToStart: 0, msToEnd: endsAt - t };
  if (startsAt - t > EXAM_HEADS_UP_MS) return null;
  return { phase: "soon", startsAt, endsAt, prizeGhs: s.prizeGhs, msToStart: startsAt - t, msToEnd: endsAt - t };
}

/** "2h 05m", "4m 09s", "3 days" */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 2 * 86400) return `${Math.floor(s / 86400)} days`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

/** "today at 12:00 GMT", "tomorrow at 12:00 GMT" or "Saturday at 12:00 GMT" (Ghana time is GMT). */
export function examDay(startsAt: number, now = Date.now()): string {
  const d = new Date(startsAt);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const dayNo = (x: number) => Math.floor(x / 86400e3);
  const diff = dayNo(startsAt) - dayNo(now);
  const day = diff === 0 ? "today" : diff === 1 ? "tomorrow" : d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return `${day} at ${time} GMT`;
}
