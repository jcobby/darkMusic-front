"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFanToken } from "./FanAuthProvider";
import { getMyBids, type MyBid } from "@/lib/api";
import { cdnImage } from "@/lib/cdn";

const ghs = (n: number) => `GH₵${n.toLocaleString("en-US")}`;
const payBy = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" });

const STATUS: Record<MyBid["status"], { label: string; className: string }> = {
  leading: { label: "Winning", className: "bg-accent text-white" },
  outbid: { label: "Outbid — bid again", className: "border border-accent/60 text-white" },
  won: { label: "You won — pay now", className: "bg-accent text-white shadow-glow-sm" },
  paid: { label: "Paid", className: "bg-white text-ink" },
  lost: { label: "Ended", className: "border border-white/10 text-neutral-500" },
  lapsed: { label: "Payment missed", className: "border border-white/10 text-neutral-500" },
};

/** Auctions the fan has bid on (Worn on Set and shop), with their position in each. */
export function MyBids() {
  const [bids, setBids] = useState<MyBid[]>([]);

  useEffect(() => {
    const token = getFanToken();
    if (token) void getMyBids(token).then(setBids);
  }, []);

  if (bids.length === 0) return null;
  const active = bids.filter((b) => b.status === "leading" || b.status === "outbid" || b.status === "won");

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-white">
          Your auction bids
          {active.length > 0 && <span className="ml-2 text-xs font-normal text-neutral-400">{active.length} active</span>}
        </p>
        <Link href="/worn-on-set" className="text-xs font-semibold text-accent hover:underline">
          Worn on Set →
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {bids.map((b) => {
          const s = STATUS[b.status];
          return (
            <li key={b.slug}>
              <Link
                href={b.path || `/merch/${b.slug}`}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition hover:border-accent/40 ${
                  b.status === "won" ? "border-accent/50 bg-accent/10" : "border-white/[0.06]"
                }`}
              >
                {b.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cdnImage(b.image, 120)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded-lg bg-ink-600" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{b.name}</span>
                  <span className="block text-xs text-neutral-400">
                    {b.status === "won" && b.payBy
                      ? `Pay ${ghs(b.highBidGhs ?? b.myBestBidGhs)} by ${payBy(b.payBy)}`
                      : `Your bid ${ghs(b.myBestBidGhs)}${
                          b.highBidGhs != null && b.highBidGhs !== b.myBestBidGhs ? ` · top ${ghs(b.highBidGhs)}` : ""
                        }`}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.className}`}>{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
