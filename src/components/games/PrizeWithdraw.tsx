"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getMyPrizes, withdrawPrize, MOMO_NETWORKS, type MyPrize } from "@/lib/api";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { PRIZE_GAME, monthName } from "./LeaderboardParts";

const NETWORK_LABEL: Record<string, string> = {
  MTN: "MTN MoMo",
  Telecel: "Telecel Cash",
  AirtelTigo: "AirtelTigo Money",
};
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

/** The signed-in fan's game prizes, with a form to withdraw a win to Mobile Money. Renders nothing if they have none. */
export function PrizeWithdraw() {
  const { user } = useFanAuth();
  const [prizes, setPrizes] = useState<MyPrize[]>([]);

  useEffect(() => {
    const token = getFanToken();
    if (!token) {
      setPrizes([]);
      return;
    }
    let live = true;
    void getMyPrizes(token, PRIZE_GAME).then((p) => {
      if (!live) return;
      setPrizes(p);
      // The "You won" email links to /account#prize — the card only exists once loaded, so scroll now.
      if (p.length && window.location.hash === "#prize") {
        requestAnimationFrame(() => document.getElementById("prize")?.scrollIntoView({ behavior: "smooth" }));
      }
    });
    return () => {
      live = false;
    };
  }, [user?.id]);

  if (!user || prizes.length === 0) return null;
  return (
    <div id="prize" className="scroll-mt-24 space-y-4">
      {prizes.slice(0, 3).map((p) => (
        <PrizeCard key={p.month} prize={p} onChange={(np) => setPrizes((all) => all.map((x) => (x.month === np.month ? np : x)))} />
      ))}
    </div>
  );
}

function PrizeCard({ prize, onChange }: { prize: MyPrize; onChange: (p: MyPrize) => void }) {
  const [editing, setEditing] = useState(prize.status === "won");
  const [network, setNetwork] = useState(prize.momo?.network ?? "MTN");
  const [number, setNumber] = useState("");
  const [accountName, setAccountName] = useState(prize.momo?.accountName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = `GH₵${prize.amountGhs.toLocaleString("en-US")}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await withdrawPrize(token, PRIZE_GAME, prize.month, { network, number, accountName }));
      setEditing(false);
      setNumber("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your request");
    } finally {
      setBusy(false);
    }
  }

  if (prize.status === "paid") {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-2 p-5 text-sm">
        <p className="text-white">
          🏆 Beat Breaker prize · {monthName(prize.month)}
        </p>
        <p className="font-semibold text-accent">
          ✓ {amount} paid{prize.paidAt ? ` on ${day(prize.paidAt)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden border-accent/50">
      <div className="bg-gradient-to-r from-accent-deep/60 to-transparent p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Beat Breaker · {monthName(prize.month)}</p>
        <p className="mt-1 font-display text-2xl font-bold text-white">🏆 You won {amount}!</p>
        {prize.status === "won" ? (
          <p className="mt-1 text-sm text-neutral-300">
            Withdraw it to your Mobile Money. DMY checks the top scores, then sends the money within 7 days.
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-200">
            Withdrawal requested{prize.requestedAt ? ` on ${day(prize.requestedAt)}` : ""} — {amount} to{" "}
            <b className="text-white">
              {NETWORK_LABEL[prize.momo?.network ?? ""] ?? prize.momo?.network} {prize.momo?.number}
            </b>
            {prize.momo?.accountName ? ` (${prize.momo.accountName})` : ""}. We&apos;ll email you when it&apos;s sent.
          </p>
        )}
      </div>

      {editing ? (
        <form onSubmit={submit} className="grid gap-3 p-5 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-neutral-400">Mobile Money network</span>
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
            <input
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="024 123 4567"
              required
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-neutral-400">Name on the Mobile Money account</span>
            <input
              className="input"
              autoComplete="name"
              placeholder="As registered with your network"
              required
              minLength={3}
              maxLength={80}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-accent min-h-[48px]">
              {busy ? "Sending…" : prize.status === "won" ? `Withdraw ${amount}` : "Save new details"}
            </button>
            {prize.status === "requested" && (
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost min-h-[44px] text-sm">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="px-5 py-3">
          <button type="button" onClick={() => setEditing(true)} className="min-h-[40px] text-sm font-semibold text-neutral-300 hover:text-white">
            Wrong number? Change details
          </button>
        </div>
      )}
    </div>
  );
}
