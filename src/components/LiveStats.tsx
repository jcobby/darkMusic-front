"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { getLiveStats, type LiveStats as LiveStatsData } from "@/lib/api";

const ITEMS: { key: keyof LiveStatsData; label: string }[] = [
  { key: "plays", label: "Streams" },
  { key: "downloads", label: "Downloads" },
  { key: "beats", label: "Beats downloaded" },
  { key: "merch", label: "Merch sold" },
  { key: "countries", label: "Countries" },
];

/** Counts up from 0 to `value` the first time it scrolls into view. */
function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.floor(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

/** Public live-counters band. Real numbers from the API; hidden until loaded. */
export function LiveStats() {
  const [stats, setStats] = useState<LiveStatsData | null>(null);

  useEffect(() => {
    getLiveStats().then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {ITEMS.map((it) => (
        <div key={it.key} className="card-hover p-5 text-center">
          <div className="gradient-text font-display text-3xl font-bold sm:text-4xl">
            <Counter value={stats[it.key]} />
          </div>
          <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
