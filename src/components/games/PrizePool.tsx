"use client";

import { useEffect, useState } from "react";
import { getPrizePool, type PrizePool as Pool } from "@/lib/api";
import { PRIZE_GAME, monthName, timeLeft } from "./LeaderboardParts";

const money = (n: number) => `GH₵${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

const WINNER_STATUS: Record<Pool["winners"][number]["status"], { label: string; className: string }> = {
  checking: { label: "Score check", className: "bg-white/10 text-neutral-200" },
  in_wallet: { label: "In winner's wallet", className: "bg-yellow-400/15 text-yellow-300" },
  withdrawing: { label: "Being paid", className: "bg-accent/15 text-white" },
  paid: { label: "Paid ✓", className: "bg-emerald-500/15 text-emerald-300" },
};

/**
 * The monthly prize, in the open: how much DMY has deposited (each deposit with
 * its Paystack reference), how the winner gets paid, past winners and the total
 * paid out so far.
 */
export function PrizePool() {
  const [p, setP] = useState<Pool | null>(null);
  useEffect(() => {
    let live = true;
    void getPrizePool(PRIZE_GAME).then((r) => live && setP(r));
    return () => {
      live = false;
    };
  }, []);
  if (!p) return null;
  const { pool } = p;

  return (
    <div className="card overflow-hidden">
      <div className="relative p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_0%_0%,rgba(250,204,21,0.14),transparent_60%),radial-gradient(70%_100%_at_100%_100%,rgba(191,0,255,0.22),transparent_60%)]" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">Prize pool · {monthName(p.month)}</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <p className="font-display text-5xl font-bold text-white drop-shadow-[0_0_24px_rgba(250,204,21,0.35)] sm:text-6xl">
              💰 {money(pool.prizeGhs)}
            </p>
            <p className="pb-2 text-sm font-semibold text-white">⏱ {timeLeft(p.endsAt)}</p>
          </div>
          {pool.funded ? (
            <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
              <p className="font-semibold text-emerald-300">✓ Deposited by DMY — held for this month&apos;s winner</p>
              <ul className="mt-1 space-y-0.5 text-xs text-neutral-300">
                {pool.deposits.map((d, i) => (
                  <li key={i}>
                    {money(d.amountGhs)} paid in on {day(d.paidAt)} · Paystack ref <span className="font-mono text-white">…{d.ref}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-neutral-300">
              ⏳ DMY deposits the prize here through Paystack — you&apos;ll see the payment the moment it&apos;s in.
            </p>
          )}

          <ol className="mt-4 grid gap-2 text-xs text-neutral-300 sm:grid-cols-3">
            <li className="rounded-xl bg-white/[0.03] p-3">
              <b className="block text-white">1 · Top the board</b>Highest Beat Breaker score when the month ends wins the pool.
            </li>
            <li className="rounded-xl bg-white/[0.03] p-3">
              <b className="block text-white">2 · Into your wallet</b>The prize lands in the winner&apos;s DMY wallet, with a {p.reviewHours}-hour score check.
            </li>
            <li className="rounded-xl bg-white/[0.03] p-3">
              <b className="block text-white">3 · Withdraw</b>The winner withdraws it to Mobile Money — Paystack sends it.
            </li>
          </ol>
        </div>
      </div>

      {(p.winners.length > 0 || p.totalPaidOutGhs > 0) && (
        <div className="border-t border-white/[0.06] p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-white">🏆 Past winners</p>
            <p className="text-xs text-neutral-400">
              Paid out to winners so far: <b className="text-white">{money(p.totalPaidOutGhs)}</b>
            </p>
          </div>
          <ul className="mt-3 divide-y divide-white/[0.05]">
            {p.winners.map((w) => {
              const s = WINNER_STATUS[w.status];
              return (
                <li key={w.month} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="text-neutral-400">{monthName(w.month)}</span> · <b className="text-white">{w.name}</b>
                    {w.score != null && <span className="text-neutral-500"> · {w.score.toLocaleString()} pts</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <b className="tabular-nums text-white">{money(w.amountGhs)}</b>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.className}`}>{s.label}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
