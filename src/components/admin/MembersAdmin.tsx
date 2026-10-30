"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/lib/adminApi";

type Tier = "supporter" | "vip" | "legend";
interface Payment {
  reference: string;
  tier: Tier;
  amountGhs: number;
  paidAt: string;
  until: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  activeTier: Tier | null;
  memberUntil: string | null;
}
interface MembersData {
  active: Record<Tier, number>;
  thisMonthGhs: number;
  payments: Payment[];
}

const BADGE: Record<Tier, string> = { supporter: "💜 Supporter", vip: "💎 VIP", legend: "👑 Legend" };
const day = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** DMY memberships: who's a member now, this month's takings, and every payment. */
export function MembersAdmin() {
  const [data, setData] = useState<MembersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminGet<MembersData>("/memberships")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load memberships"));
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-500">Loading…</p>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(["legend", "vip", "supporter"] as Tier[]).map((t) => (
          <div key={t} className="card p-4">
            <p className="text-xs uppercase tracking-wider text-neutral-500">{BADGE[t]}</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{data.active[t]}</p>
            <p className="text-xs text-neutral-400">members now</p>
          </div>
        ))}
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-neutral-500">This month</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">GH₵{data.thisMonthGhs.toLocaleString()}</p>
          <p className="text-xs text-neutral-400">from memberships</p>
        </div>
      </div>
      <p className="text-sm text-neutral-400">
        A membership is one month at a time (Mobile Money or card via Paystack) — nothing renews by itself. Members get a reminder email 3 days before
        theirs ends. Every payment is also in your Paystack dashboard.
      </p>
      {data.payments.length === 0 ? (
        <p className="card p-6 text-center text-sm text-neutral-500">No memberships yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.payments.map((p) => (
            <li key={p.reference} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-white">
                  {p.name || p.email} <span className="font-normal text-neutral-400">· {BADGE[p.tier]} · GH₵{p.amountGhs}</span>
                </p>
                <p className="text-xs text-neutral-400">
                  <a href={`mailto:${p.email}`} className="underline">
                    {p.email}
                  </a>
                  {p.phone && ` · ${p.phone}`} · paid {day(p.paidAt)}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.activeTier ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neutral-400"}`}>
                {p.activeTier && p.memberUntil ? `${BADGE[p.activeTier]} until ${day(p.memberUntil)}` : "Ended"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
