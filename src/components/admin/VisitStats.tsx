"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/lib/adminApi";

interface Day {
  date: string; // YYYY-MM-DD
  count: number;
}
interface StatsData {
  total: number;
  daily: Day[];
}

function dayLabel(date: string) {
  const d = new Date(date + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
}
function dayNum(date: string) {
  return new Date(date + "T00:00:00Z").toLocaleDateString(undefined, {
    day: "numeric",
    timeZone: "UTC",
  });
}

export function VisitStats() {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    adminGet<StatsData>("/visits")
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;
  const max = Math.max(...data.daily.map((d) => d.count), 1);
  const last7Total = data.daily.reduce((s, d) => s + d.count, 0);

  return (
    <div className="card mb-8 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Site visits</p>
          <p className="text-3xl font-bold text-white">
            {data.total.toLocaleString()}
            <span className="ml-2 text-sm font-normal text-neutral-500">all time</span>
          </p>
        </div>
        <p className="text-xs text-neutral-500">
          Last 7 days · <span className="font-semibold text-accent">{last7Total}</span>
        </p>
      </div>

      <div className="mt-6 flex items-end gap-2 sm:gap-3" style={{ height: 120 }}>
        {data.daily.map((d, i) => {
          const isToday = i === data.daily.length - 1;
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[11px] font-medium text-neutral-300">{d.count}</span>
              <div
                className={`w-full rounded-t-md transition-all ${
                  isToday
                    ? "bg-gradient-to-t from-accent-deep to-accent shadow-glow-sm"
                    : "bg-gradient-to-t from-ink-600 to-ink-500"
                }`}
                style={{ height: `${(d.count / max) * 84 + 4}px` }}
                title={`${d.date}: ${d.count} visits`}
              />
              <span className="text-[10px] leading-none text-neutral-500">{dayLabel(d.date)}</span>
              <span className="text-[10px] leading-none text-neutral-600">{dayNum(d.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
