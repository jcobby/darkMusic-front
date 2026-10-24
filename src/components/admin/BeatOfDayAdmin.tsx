"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet, adminPut } from "@/lib/adminApi";

interface Schedule {
  days: { day: string; pinned: boolean; beat: { id: string; title: string } | null }[];
  beats: { id: string; title: string }[];
}

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** The next two weeks' Beats of the Day: each day rotates through the free beats unless you pin one. */
export function BeatOfDayAdmin() {
  const [data, setData] = useState<Schedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await adminGet<Schedule>("/beat-of-the-day"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function pin(day: string, beatId: string) {
    setBusy(day);
    setError(null);
    try {
      await adminPut("/beat-of-the-day", { day, beatId: beatId || null });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change it");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card p-5">
      <h3 className="font-semibold text-white">🎧 Beat of the Day</h3>
      <p className="mt-1 text-sm text-neutral-400">
        It plays first in every game that day, and in Beat Breaker its kicks score ×3 instead of ×2. Days rotate through the free beats — pin one
        to feature it (a release day, say).
      </p>
      {error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {!data ? (
        <p className="mt-3 text-sm text-neutral-500">Loading…</p>
      ) : data.beats.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">Add a free beat (with its MP3) first.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.05] text-sm">
          {data.days.map((d) => (
            <li key={d.day} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="w-28 text-neutral-300">{dayLabel(d.day)}</span>
              <span className="min-w-0 flex-1 truncate text-white">
                {d.beat?.title ?? "—"}
                {d.pinned && <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-white">pinned</span>}
              </span>
              <select
                className="input w-auto py-1.5 text-xs"
                value={d.pinned ? (d.beat?.id ?? "") : ""}
                disabled={busy === d.day}
                onChange={(e) => pin(d.day, e.target.value)}
              >
                <option value="">Rotation</option>
                {data.beats.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
