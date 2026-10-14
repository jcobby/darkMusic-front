"use client";

import { useEffect, useState } from "react";

function left(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** Ticking "ends in" label. Renders nothing time-based on the server (no hydration mismatch). */
export function AuctionCountdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = new Date(endsAt).getTime() - (now ?? 0);
  if (now === null) return <span className={className}>…</span>;
  return (
    <span className={`${className} ${ms > 0 && ms < 3600e3 ? "text-accent" : ""}`}>
      {ms > 0 ? left(ms) : "Ended"}
    </span>
  );
}
