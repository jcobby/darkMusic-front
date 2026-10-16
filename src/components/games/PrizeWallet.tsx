"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { cancelWithdrawal, getWallet, requestWithdrawal, MOMO_NETWORKS, type Wallet, type WalletTxn } from "@/lib/api";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { monthName } from "./LeaderboardParts";

const NETWORK_LABEL: Record<string, string> = { MTN: "MTN MoMo", Telecel: "Telecel Cash", AirtelTigo: "AirtelTigo Money" };
const money = (n: number) => `GH₵${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

const WITHDRAWAL_STATUS: Record<string, string> = {
  requested: "Waiting for DMY to send",
  sending: "Sending…",
  otp: "Sending…",
  paid: "Paid ✓",
  failed: "Couldn't send — DMY will retry",
  rejected: "Declined",
  cancelled: "Cancelled",
};

/**
 * The player's DMY wallet: the monthly game prize lands here; after the score
 * check they withdraw it to Mobile Money (DMY approves, Paystack sends it).
 * `showEmpty` shows the wallet even before any winnings (on the account page).
 */
export function PrizeWallet({ showEmpty = false }: { showEmpty?: boolean }) {
  const { user } = useFanAuth();
  const [w, setW] = useState<Wallet | null>(null);
  const [form, setForm] = useState(false);
  const [network, setNetwork] = useState<string>("MTN");
  const [number, setNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getFanToken();
    if (!token) return setW(null);
    const r = await getWallet(token);
    setW(r);
    // The "you won" email links to /account#wallet — the card only exists once loaded.
    if (r && window.location.hash === "#wallet") {
      requestAnimationFrame(() => document.getElementById("wallet")?.scrollIntoView({ behavior: "smooth" }));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, user?.id]);

  if (!user || !w) return null;
  if (!showEmpty && w.txns.length === 0) return null;
  const open = w.txns.find((t) => t.kind === "withdrawal" && ["requested", "sending", "otp"].includes(t.status));
  const nextRelease = w.txns.find((t) => t.kind === "prize" && t.status === "review")?.availableAt ?? null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await requestWithdrawal(token, { network, number, accountName });
      setForm(false);
      setNumber("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your request");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(t: WalletTxn) {
    const token = getFanToken();
    if (!token || !confirm("Cancel this withdrawal? The money stays in your wallet.")) return;
    try {
      await cancelWithdrawal(token, t.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't cancel");
    }
    await load();
  }

  return (
    <div id="wallet" className="card scroll-mt-24 overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-400/10 via-accent-deep/30 to-transparent p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">Your DMY wallet</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-4xl font-bold text-white">{money(w.availableGhs)}</p>
            <p className="text-xs text-neutral-400">ready to withdraw</p>
          </div>
          {w.availableGhs > 0 && !open && !form && (
            <button type="button" onClick={() => setForm(true)} className="btn-accent min-h-[48px]">
              Withdraw to MoMo
            </button>
          )}
        </div>
        {w.inReviewGhs > 0 && (
          <p className="mt-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-100">
            🏆 {money(w.inReviewGhs)} prize in the score check — ready to withdraw {nextRelease ? `from ${when(nextRelease)}` : "soon"}.
          </p>
        )}
        {open && (
          <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-200">
            💸 {money(open.amountGhs)} on its way to {NETWORK_LABEL[open.momo?.network ?? ""] ?? open.momo?.network}{" "}
            <b className="text-white">{open.momo?.number}</b> ({open.momo?.accountName}) — {WITHDRAWAL_STATUS[open.status]}.
            {open.status === "requested" && (
              <button type="button" onClick={() => cancel(open)} className="ml-2 text-xs font-semibold text-neutral-400 underline hover:text-white">
                Cancel / fix details
              </button>
            )}
          </p>
        )}
        {w.txns.length === 0 && (
          <p className="mt-3 text-sm text-neutral-400">
            Win the monthly{" "}
            <Link href="/games/leaderboard" className="font-semibold text-accent hover:underline">
              Beat Breaker prize
            </Link>{" "}
            and it lands here — then withdraw it to Mobile Money.
          </p>
        )}
      </div>

      {form && (
        <form onSubmit={submit} className="grid gap-3 border-t border-white/[0.06] p-5 sm:grid-cols-2">
          <p className="text-sm text-white sm:col-span-2">
            Withdraw <b>{money(w.availableGhs)}</b> to your Mobile Money. DMY approves it and Paystack sends it.
          </p>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-400">Network</span>
            <select className="input" value={network} onChange={(e) => setNetwork(e.target.value)}>
              {MOMO_NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {NETWORK_LABEL[n]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-400">Mobile Money number</span>
            <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="024 123 4567" required value={number} onChange={(e) => setNumber(e.target.value)} />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-neutral-400">Name on the Mobile Money account</span>
            <input className="input" autoComplete="name" placeholder="As registered with your network" required minLength={3} maxLength={80} value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          </label>
          {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-accent min-h-[48px]">
              {busy ? "Sending…" : `Withdraw ${money(w.availableGhs)}`}
            </button>
            <button type="button" onClick={() => setForm(false)} className="btn-ghost min-h-[44px] text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {w.txns.length > 0 && (
        <ul className="divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {w.txns.slice(0, 8).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <span className="min-w-0 text-neutral-300">
                {t.kind === "prize" ? (
                  <>
                    🏆 Beat Breaker prize · {t.month ? monthName(t.month) : ""}
                    <span className="block text-xs text-neutral-500">
                      {t.status === "review" ? `Score check until ${when(t.availableAt)}` : "Ready to withdraw"}
                    </span>
                  </>
                ) : (
                  <>
                    💸 Withdrawal to {NETWORK_LABEL[t.momo?.network ?? ""] ?? t.momo?.network} {t.momo?.number}
                    <span className="block text-xs text-neutral-500">
                      {WITHDRAWAL_STATUS[t.status] ?? t.status}
                      {t.status === "paid" && t.paidAt ? ` · ${when(t.paidAt)}` : ""}
                      {t.status === "rejected" && t.note ? ` — ${t.note}` : ""}
                    </span>
                  </>
                )}
              </span>
              {t.kind === "withdrawal" && ["failed", "rejected", "cancelled"].includes(t.status) ? (
                // Didn't go out — the money stayed in the wallet
                <span className="tabular-nums text-neutral-500 line-through">{money(t.amountGhs)}</span>
              ) : (
                <b className={`tabular-nums ${t.kind === "prize" ? "text-emerald-300" : "text-white"}`}>
                  {t.kind === "prize" ? "+" : "−"}
                  {money(t.amountGhs)}
                </b>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
