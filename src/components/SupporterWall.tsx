"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupporterWall, type SupporterWall as Wall } from "@/lib/api";

const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });

/**
 * This month's Supporter Wall: 👑 Legends up top, then 💎 VIPs and 💜 Supporters, then
 * donors who said yes to their name on it. A thank-you, and a nudge to join them.
 */
export function SupporterWall({ className = "" }: { className?: string }) {
  const [wall, setWall] = useState<Wall | null>(null);
  useEffect(() => {
    getSupporterWall().then(setWall).catch(() => {});
  }, []);
  if (!wall) return null;
  const empty = !wall.legends.length && !wall.vips.length && !wall.supporters.length && !wall.donors.length;
  const row = (icon: string, label: string, names: string[], cls: string) =>
    names.length > 0 && (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
          {icon} {label}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {names.map((n, i) => (
            <span key={`${n}-${i}`} className={`rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>
              {n}
            </span>
          ))}
        </div>
      </div>
    );

  return (
    <section id="supporters" className={`card scroll-mt-24 overflow-hidden ${className}`}>
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-accent/15 to-transparent p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">{monthName(wall.month)} · thank you</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">💜 Supporter Wall</h2>
        <p className="mt-1 text-sm text-neutral-300">The real ones keeping the games free for everyone this month.</p>
      </div>
      <div className="space-y-4 p-5">
        {empty ? (
          <p className="text-sm text-neutral-400">Nobody yet this month — be the first name up here.</p>
        ) : (
          <>
            {row("👑", "Legends", wall.legends, "bg-yellow-400 text-ink")}
            {row("💎", "VIPs", wall.vips, "bg-cyan-300/15 text-cyan-100")}
            {row("💜", "Supporters", wall.supporters, "bg-accent/20 text-white")}
            {row("❤️", "Donors", wall.donors, "bg-white/[0.06] text-neutral-200")}
          </>
        )}
        <Link href="/membership" className="btn-outline min-h-[44px] text-sm">
          Get on the wall — from GH₵10 a month →
        </Link>
      </div>
    </section>
  );
}
