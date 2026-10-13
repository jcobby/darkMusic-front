"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGet } from "@/lib/adminApi";

interface Day {
  date: string; // YYYY-MM-DD
  count: number;
}
interface StatsData {
  total: number; // all time
  from: string;
  to: string;
  rangeTotal: number;
  daily: Day[];
  hourly: number[]; // 24 entries, UTC (= Ghana time)
  hourlyTracked: number;
  previous: { from: string; to: string; total: number };
  firstDate: string | null;
}

// Dates are UTC calendar days — the same as Ghana time.
const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (date: string, days: number) => iso(new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000));
const todayIso = () => iso(new Date());
const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
const longDay = (date: string) => fmt(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortDay = (date: string) => fmt(date, { day: "numeric", month: "short" });
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

type PresetId = "today" | "yesterday" | "weekAgo" | "7d" | "30d" | "90d";
const PRESETS: { id: PresetId; label: string; range: () => [string, string] }[] = [
  { id: "today", label: "Today", range: () => [todayIso(), todayIso()] },
  { id: "yesterday", label: "Yesterday", range: () => [shift(todayIso(), -1), shift(todayIso(), -1)] },
  { id: "weekAgo", label: "A week ago", range: () => [shift(todayIso(), -7), shift(todayIso(), -7)] },
  { id: "7d", label: "Last 7 days", range: () => [shift(todayIso(), -6), todayIso()] },
  { id: "30d", label: "Last 30 days", range: () => [shift(todayIso(), -29), todayIso()] },
  { id: "90d", label: "Last 90 days", range: () => [shift(todayIso(), -89), todayIso()] },
];

function rangeLabel(from: string, to: string) {
  if (from === to) {
    if (from === todayIso()) return `Today · ${longDay(from)}`;
    if (from === shift(todayIso(), -1)) return `Yesterday · ${longDay(from)}`;
    return longDay(from);
  }
  return `${shortDay(from)} – ${longDay(to)}`;
}

interface Bar {
  key: string;
  tick: string | null; // x-axis label (null = no label under this bar)
  value: number;
  tip: string; // tooltip heading
}

/** Single-series bar chart: rounded data ends on a shared baseline, the peak
 *  labelled, and a tooltip on hover/focus for every bar. */
function BarChart({ bars, label }: { bars: Bar[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...bars.map((b) => b.value), 1);
  const peak = bars.findIndex((b) => b.value === max && b.value > 0);
  const HEIGHT = 140;

  return (
    <div role="group" aria-label={label}>
      <div className="relative flex items-end" style={{ height: HEIGHT + 22 }} onMouseLeave={() => setActive(null)}>
        {/* Recessive gridlines at half and full scale */}
        {[0.5, 1].map((f) => (
          <span
            key={f}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/[0.06]"
            style={{ bottom: f * HEIGHT }}
          />
        ))}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-white/15" />
        {bars.map((b, i) => {
          const h = b.value ? Math.max(4, (b.value / max) * HEIGHT) : 0;
          const on = active === i;
          return (
            <button
              key={b.key}
              type="button"
              aria-label={`${b.tip}: ${b.value.toLocaleString()} visits`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full flex-1 items-end justify-center px-px outline-none"
            >
              {i === peak && active === null && (
                <span className="absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold text-neutral-200" style={{ bottom: h + 4 }}>
                  {b.value.toLocaleString()}
                </span>
              )}
              <span
                className={`block w-full max-w-[44px] rounded-t-[4px] transition-colors ${
                  on ? "bg-accent-soft" : "bg-accent"
                } group-focus-visible:ring-2 group-focus-visible:ring-white/60`}
                style={{ height: h }}
              />
              {on && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-left text-xs shadow-card"
                  style={{
                    bottom: h + 8,
                    left: i < bars.length * 0.15 ? "0%" : i > bars.length * 0.85 ? "100%" : "50%",
                    transform: `translateX(${i < bars.length * 0.15 ? "0" : i > bars.length * 0.85 ? "-100%" : "-50%"})`,
                  }}
                >
                  <span className="block text-neutral-400">{b.tip}</span>
                  <span className="block font-semibold text-white">{b.value.toLocaleString()} visits</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex h-3" aria-hidden>
        {bars.map((b) => (
          <span key={b.key} className="relative flex-1">
            {b.tick && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] leading-none text-neutral-500">
                {b.tick}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VisitStats() {
  const [preset, setPreset] = useState<PresetId | "custom">("7d");
  const [[from, to], setRange] = useState<[string, string]>(() => PRESETS[3].range());
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    adminGet<StatsData>(`/visits?from=${from}&to=${to}`)
      .then((d) => {
        if (!live) return;
        setData(d);
        setError(null);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load visits"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [from, to]);

  const pick = (id: PresetId) => {
    setPreset(id);
    setRange(PRESETS.find((p) => p.id === id)!.range());
  };

  const singleDay = data ? data.from === data.to : from === to;

  const dailyBars: Bar[] = useMemo(() => {
    if (!data) return [];
    const n = data.daily.length;
    const every = n <= 10 ? 1 : Math.ceil(n / 7);
    return data.daily.map((d, i) => ({
      key: d.date,
      tick: (n - 1 - i) % every === 0 ? (n <= 10 ? fmt(d.date, { weekday: "short", day: "numeric" }) : shortDay(d.date)) : null,
      value: d.count,
      tip: longDay(d.date),
    }));
  }, [data]);

  const hourlyBars: Bar[] = useMemo(
    () =>
      (data?.hourly ?? Array(24).fill(0)).map((v: number, h: number) => ({
        key: String(h),
        tick: h % 3 === 0 ? hourLabel(h) : null,
        value: v,
        tip: `${hourLabel(h)}–${hourLabel((h + 1) % 24)}${singleDay ? "" : " (all days)"}`,
      })),
    [data, singleDay]
  );

  const change = data && data.previous.total > 0 ? ((data.rangeTotal - data.previous.total) / data.previous.total) * 100 : null;
  const busiestHour = data && data.hourlyTracked > 0 ? data.hourly.indexOf(Math.max(...data.hourly)) : null;
  const busiestDay =
    data && !singleDay && data.rangeTotal > 0 ? data.daily.reduce((a, b) => (b.count > a.count ? b : a)) : null;
  const avg = data && !singleDay ? Math.round(data.rangeTotal / data.daily.length) : null;
  const prevLabel = data
    ? data.previous.from === data.previous.to
      ? longDay(data.previous.from)
      : `${shortDay(data.previous.from)} – ${shortDay(data.previous.to)}`
    : "";

  return (
    <div className="card mb-8 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">Site visits</p>
        {data && (
          <p className="text-xs text-neutral-500">
            All time · <span className="font-semibold text-neutral-200">{data.total.toLocaleString()}</span>
          </p>
        )}
      </div>

      {/* Date range: presets first, then a custom range */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(p.id)}
            aria-pressed={preset === p.id}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              preset === p.id
                ? "border-accent bg-accent text-white"
                : "border-white/10 text-neutral-300 hover:border-accent/50 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" aria-hidden />
        <label className="flex items-center gap-1.5 text-xs text-neutral-400">
          From
          <input
            type="date"
            value={from}
            max={todayIso()}
            onChange={(e) => {
              if (!e.target.value) return;
              setPreset("custom");
              setRange(([, t]) => [e.target.value, e.target.value > t ? e.target.value : t]);
            }}
            className="rounded-lg border border-white/10 bg-ink-800 px-2 py-1 text-xs text-white [color-scheme:dark]"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-neutral-400">
          To
          <input
            type="date"
            value={to}
            max={todayIso()}
            onChange={(e) => {
              if (!e.target.value) return;
              setPreset("custom");
              setRange(([f]) => [e.target.value < f ? e.target.value : f, e.target.value]);
            }}
            className="rounded-lg border border-white/10 bg-ink-800 px-2 py-1 text-xs text-white [color-scheme:dark]"
          />
        </label>
      </div>

      {error && !data && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {data && (
        <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
          {/* Headline */}
          <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs text-neutral-400">{rangeLabel(data.from, data.to)}</p>
              <p className="font-display text-4xl font-bold text-white">
                {data.rangeTotal.toLocaleString()}
                <span className="ml-2 text-sm font-normal text-neutral-500">visit{data.rangeTotal === 1 ? "" : "s"}</span>
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {change === null ? (
                  <>No visits recorded for the period before ({prevLabel})</>
                ) : (
                  <>
                    <span className={`font-semibold ${change >= 0 ? "text-white" : "text-neutral-300"}`}>
                      {change >= 0 ? "▲" : "▼"} {Math.abs(Math.round(change))}%
                    </span>{" "}
                    vs {prevLabel} ({data.previous.total.toLocaleString()})
                  </>
                )}
              </p>
            </div>
            {avg !== null && (
              <div>
                <p className="text-xs text-neutral-400">Daily average</p>
                <p className="text-xl font-bold text-white">{avg.toLocaleString()}</p>
              </div>
            )}
            {busiestDay && (
              <div>
                <p className="text-xs text-neutral-400">Busiest day</p>
                <p className="text-xl font-bold text-white">
                  {shortDay(busiestDay.date)}{" "}
                  <span className="text-sm font-normal text-neutral-400">{busiestDay.count.toLocaleString()}</span>
                </p>
              </div>
            )}
            {busiestHour !== null && (
              <div>
                <p className="text-xs text-neutral-400">Busiest hour</p>
                <p className="text-xl font-bold text-white">
                  {hourLabel(busiestHour)}–{hourLabel((busiestHour + 1) % 24)}
                </p>
              </div>
            )}
          </div>

          {/* Charts */}
          {!singleDay && (
            <div className="mt-7">
              <p className="mb-3 text-xs font-semibold text-neutral-300">Visits per day</p>
              <BarChart bars={dailyBars} label="Visits per day" />
            </div>
          )}
          <div className="mt-7">
            <p className="mb-3 text-xs font-semibold text-neutral-300">
              {singleDay ? "Visits per hour" : "Visits by time of day (all days in the range)"}{" "}
              <span className="font-normal text-neutral-500">· Ghana time (GMT)</span>
            </p>
            {data.hourlyTracked > 0 ? (
              <BarChart bars={hourlyBars} label="Visits per hour" />
            ) : (
              <p className="rounded-xl border border-white/[0.06] p-4 text-sm text-neutral-500">
                {data.rangeTotal > 0
                  ? "This period is from before hourly tracking started, so there's no time-of-day breakdown."
                  : "No visits in this period."}
              </p>
            )}
            {data.hourlyTracked > 0 && data.hourlyTracked < data.rangeTotal && (
              <p className="mt-2 text-xs text-neutral-500">
                Hourly times cover {data.hourlyTracked.toLocaleString()} of {data.rangeTotal.toLocaleString()} visits —
                visits before hourly tracking started only have a daily count.
              </p>
            )}
          </div>

          {/* Table view */}
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            className="mt-6 text-xs font-semibold text-accent hover:underline"
          >
            {showTable ? "Hide table" : "View as table"}
          </button>
          {showTable && (
            <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-ink-800 text-xs text-neutral-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">{singleDay ? "Hour" : "Date"}</th>
                    <th className="px-4 py-2 text-right font-medium">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {(singleDay ? hourlyBars : [...dailyBars].reverse()).map((b) => (
                    <tr key={b.key} className="border-t border-white/[0.04]">
                      <td className="px-4 py-1.5 text-neutral-300">{b.tip}</td>
                      <td className="px-4 py-1.5 text-right font-semibold text-white">{b.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
