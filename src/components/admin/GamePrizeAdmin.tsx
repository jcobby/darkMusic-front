"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminGet, adminPost } from "@/lib/adminApi";

interface Row {
  rank: number | null; // null = disqualified
  disqualified: boolean;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  score: number;
  level: number;
  runs: number;
  achievedAt: string;
}
interface Board {
  month: string;
  prizeGhs: number;
  depositedGhs: number;
  funded: boolean;
  endsAt: string;
  ended: boolean;
  winner: { userId: string; amountGhs: number; status: "review" | "available"; availableAt: string | null } | null;
  top: Row[];
}
interface Deposits {
  month: string;
  prizeGhs: number;
  depositedGhs: number;
  funded: boolean;
  deposits: { amountGhs: number; status: "pending" | "paid" | "failed"; reference: string; paidAt: string | null; createdAt: string; by: string | null }[];
}
interface Withdrawal {
  id: string;
  amountGhs: number;
  status: "requested" | "sending" | "otp" | "paid" | "failed" | "rejected";
  momo: { network: string; number: string; accountName: string } | null;
  reference: string | null;
  failure: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  player: { id: string; name: string | null; email: string; phone: string | null } | null;
  prizes: { month: string; amountGhs: number; score: number | null; status: string }[];
}

const GAME = "beat-breaker";
const money = (n: number) => `GH₵${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

/** Current month first, then the five before it. */
function months(count = 6) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) out.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  return out;
}
const nextMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 7);
};
const label = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

const W_STATUS: Record<Withdrawal["status"], { text: string; className: string }> = {
  requested: { text: "Waiting for you", className: "bg-yellow-400/15 text-yellow-300" },
  sending: { text: "Sending (Paystack)", className: "bg-white/10 text-white" },
  otp: { text: "Needs your OTP", className: "bg-accent/20 text-white" },
  paid: { text: "Paid ✓", className: "bg-emerald-500/15 text-emerald-300" },
  failed: { text: "Failed — send again", className: "bg-red-500/15 text-red-300" },
  rejected: { text: "Declined", className: "bg-white/5 text-neutral-400" },
};

/** Beat Breaker prize: the pool (deposits via Paystack), the month's board and winner, and winners' withdrawals. */
export function GamePrizeAdmin() {
  const [month, setMonth] = useState(months()[0]);
  const [board, setBoard] = useState<Board | null>(null);
  const [deps, setDeps] = useState<Deposits | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("500");
  const [depositMonth, setDepositMonth] = useState(months()[0]);

  const load = useCallback(async () => {
    try {
      const [b, d, w] = await Promise.all([
        adminGet<Board>(`/games/${GAME}/leaderboard?month=${month}`),
        adminGet<Deposits>(`/games/${GAME}/deposits?month=${month}`),
        adminGet<Withdrawal[]>(`/wallet/withdrawals`),
      ]);
      setBoard(b);
      setDeps(d);
      setWithdrawals(w);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  // Back from Paystack after a deposit: confirm it, then tidy the address bar.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("prizeDeposit");
    if (!ref) return;
    window.history.replaceState(null, "", window.location.pathname);
    adminGet<{ status: string; amountGhs: number; month: string; poolGhs: number }>(`/games/${GAME}/deposits/verify?reference=${encodeURIComponent(ref)}`)
      .then((r) => {
        setNotice(
          r.status === "paid"
            ? `✓ ${money(r.amountGhs)} deposited into the ${label(r.month)} prize pool (now ${money(r.poolGhs)}). Players can see it.`
            : r.status === "failed"
            ? "That deposit wasn't completed on Paystack — nothing was added to the pool."
            : "Paystack hasn't confirmed that deposit yet — refresh in a minute."
        );
        setMonth(r.month);
        void load();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't confirm the deposit"));
  }, [load]);

  async function run(action: () => Promise<unknown>, failMsg: string, okMsg?: string) {
    setBusy(true);
    setNotice(null);
    try {
      const r = await action();
      const msg = (r as { message?: string } | undefined)?.message;
      if (okMsg || msg) setNotice(okMsg ?? msg ?? null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : failMsg);
    } finally {
      setBusy(false);
    }
  }

  async function deposit(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 1) return setError("Enter the amount to deposit");
    if (!confirm(`Pay ${money(n)} into the ${label(depositMonth)} prize pool with Paystack? Players will see it as deposited.`)) return;
    setBusy(true);
    try {
      const r = await adminPost<{ authorizationUrl: string }>(`/games/${GAME}/deposits`, { amountGhs: n, month: depositMonth });
      window.location.href = r.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the deposit");
      setBusy(false);
    }
  }

  function toggleDisqualified(row: Row) {
    const dq = !row.disqualified;
    const msg = dq
      ? `Disqualify ${row.name} (${row.score} pts) for ${label(month)}? Their score is hidden from the board${
          board?.ended ? " and, if they won, the prize moves to the next player's wallet (they're emailed)" : ""
        }.`
      : `Put ${row.name}'s score back on the board?`;
    if (!confirm(msg)) return;
    void run(() => adminPost(`/games/${GAME}/disqualify`, { month, userId: row.userId, disqualified: dq }), "Couldn't update the player");
  }

  const w = (id: string, action: string, body: unknown = {}) => adminPost<{ message?: string }>(`/wallet/withdrawals/${id}/${action}`, body);
  function send(x: Withdrawal) {
    if (!confirm(`Send ${money(x.amountGhs)} to ${x.momo?.network} ${x.momo?.number} (${x.momo?.accountName}) with Paystack now?`)) return;
    void run(() => w(x.id, "send"), "Paystack couldn't send it");
  }
  function otp(x: Withdrawal) {
    const code = prompt("Enter the OTP Paystack sent to you for this transfer:");
    if (!code) return;
    void run(() => w(x.id, "otp", { otp: code }), "Couldn't confirm the OTP");
  }
  function markPaid(x: Withdrawal) {
    const note = prompt(`Paid ${money(x.amountGhs)} another way (e.g. MoMo by hand)? Add the transaction ID:`, "");
    if (note === null) return;
    void run(() => w(x.id, "mark-paid", { note }), "Couldn't mark it paid", "Marked paid — the player has been emailed.");
  }
  function reject(x: Withdrawal) {
    const reason = prompt("Why are you declining it? (The player sees this; the money stays in their wallet.)", "The account name doesn't match the number");
    if (!reason) return;
    void run(() => w(x.id, "reject", { reason }), "Couldn't decline it", "Declined — the money is back in their wallet.");
  }

  const winner = board?.winner ? board.top.find((r) => r.userId === board.winner!.userId) : null;
  const waiting = withdrawals.filter((x) => ["requested", "otp", "failed", "sending"].includes(x.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Beat Breaker prize</h2>
          <p className="text-sm text-neutral-400">
            Deposit the prize into the pool (players see it), check the top scores, and send winners&apos; withdrawals — Paystack pays their MoMo.
          </p>
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto">
          {months().map((m) => (
            <option key={m} value={m}>
              {label(m)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}

      {/* ---- Withdrawals waiting ---- */}
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-white">💸 Withdrawals {waiting.length > 0 && <span className="ml-1 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-ink">{waiting.length} to do</span>}</h3>
          <p className="text-xs text-neutral-500">Check the scores behind each one before you press Send.</p>
        </div>
        {withdrawals.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No withdrawals yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.05]">
            {withdrawals.map((x) => {
              const s = W_STATUS[x.status];
              const actionable = ["requested", "failed"].includes(x.status);
              return (
                <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-white">
                      <b>{money(x.amountGhs)}</b> → {x.momo?.network} <b>{x.momo?.number}</b> ({x.momo?.accountName})
                    </p>
                    <p className="text-xs text-neutral-400">
                      {x.player?.name ?? "Player"} · {x.player?.email}
                      {x.player?.phone ? ` · ${x.player.phone}` : ""} · asked {when(x.createdAt)}
                    </p>
                    {x.prizes.length > 0 && (
                      <p className="text-xs text-neutral-500">
                        Won: {x.prizes.map((p) => `${label(p.month)} (${p.score?.toLocaleString() ?? "?"} pts, ${money(p.amountGhs)})`).join(" · ")}
                      </p>
                    )}
                    {x.failure && <p className="text-xs text-red-300">Paystack: {x.failure}</p>}
                    {x.note && <p className="text-xs text-neutral-400">Note: {x.note}</p>}
                    {x.paidAt && <p className="text-xs text-emerald-300">Paid {when(x.paidAt)}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.className}`}>{s.text}</span>
                    {actionable && (
                      <button type="button" disabled={busy} onClick={() => send(x)} className="btn-accent px-3 py-1.5 text-xs">
                        Send via Paystack
                      </button>
                    )}
                    {x.status === "otp" && (
                      <button type="button" disabled={busy} onClick={() => otp(x)} className="btn-accent px-3 py-1.5 text-xs">
                        Enter OTP
                      </button>
                    )}
                    {["requested", "failed", "otp", "sending"].includes(x.status) && (
                      <button type="button" disabled={busy} onClick={() => markPaid(x)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-300 hover:text-white">
                        Paid another way
                      </button>
                    )}
                    {actionable && (
                      <button type="button" disabled={busy} onClick={() => reject(x)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-300 hover:border-red-400 hover:text-red-300">
                        Decline
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- The pool ---- */}
      {deps && (
        <section className="card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">💰 Prize pool · {label(deps.month)}</h3>
              <p className="mt-1 font-display text-3xl font-bold text-white">{money(deps.depositedGhs)}</p>
              <p className="text-xs text-neutral-400">
                {deps.funded
                  ? "Deposited — players see this amount and each deposit's reference."
                  : `Nothing deposited yet — players see the announced ${money(deps.prizeGhs)} as "deposit coming".`}
              </p>
            </div>
            <form onSubmit={deposit} className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-neutral-400">
                Amount (GH₵)
                <input className="input mt-1 w-32" type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label className="text-xs text-neutral-400">
                Into
                <select className="input mt-1 w-auto" value={depositMonth} onChange={(e) => setDepositMonth(e.target.value)}>
                  <option value={months()[0]}>{label(months()[0])}</option>
                  <option value={nextMonth()}>{label(nextMonth())}</option>
                </select>
              </label>
              <button type="submit" disabled={busy} className="btn-accent min-h-[44px]">
                Deposit with Paystack
              </button>
            </form>
          </div>
          {deps.deposits.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-neutral-400">
              {deps.deposits.map((d) => (
                <li key={d.reference}>
                  {money(d.amountGhs)} · {d.status === "paid" ? `✓ paid ${when(d.paidAt)}` : d.status === "pending" ? "waiting for Paystack" : "not completed"} ·{" "}
                  <span className="font-mono">{d.reference}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---- The month's board ---- */}
      {board && (
        <section className="space-y-3">
          <div className="card p-4 text-sm text-neutral-300">
            {!board.ended ? (
              <>Still running — ends {new Date(board.endsAt).toLocaleString("en-GB", { timeZone: "UTC" })} GMT. The top score then wins {money(board.prizeGhs)}.</>
            ) : !board.winner ? (
              <>This month has finished{board.top.length ? "" : " — nobody played"}.</>
            ) : board.winner.status === "review" ? (
              <>
                🏆 <b className="text-white">{winner?.name ?? "The winner"}</b> has {money(board.winner.amountGhs)} in their wallet, in the
                score check until <b className="text-white">{when(board.winner.availableAt)}</b>. Check their score below — Disqualify moves
                the prize to the next player.
              </>
            ) : (
              <>
                🏆 <b className="text-white">{winner?.name ?? "The winner"}</b> got {money(board.winner.amountGhs)} — it&apos;s in their wallet to withdraw.
              </>
            )}
          </div>

          {board.top.length === 0 ? (
            <p className="card p-8 text-center text-sm text-neutral-500">No scores this month yet.</p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-right">Level</th>
                    <th className="px-4 py-3 text-right">Runs</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {board.top.map((r, i) => (
                    <tr
                      key={r.userId || `row-${i}`}
                      className={`border-t border-white/[0.05] ${r.disqualified ? "opacity-50" : r.rank === 1 ? "bg-accent/10" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-bold text-white">{r.disqualified ? "—" : r.rank}</td>
                      <td className="px-4 py-2.5 text-white">
                        {r.name}
                        {r.disqualified && <span className="ml-2 text-xs text-red-400">disqualified</span>}
                        {board.winner?.userId === r.userId && <span className="ml-2 text-xs text-yellow-300">🏆 winner</span>}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-300">
                        {r.email}
                        {r.phone && <span className="block text-xs text-neutral-500">{r.phone}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-white">{r.score.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.level}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.runs}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleDisqualified(r)}
                          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-300 hover:border-red-400 hover:text-red-300"
                        >
                          {r.disqualified ? "Restore" : "Disqualify"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
