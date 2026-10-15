"use client";

import { useCallback, useEffect, useState } from "react";
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
interface Prize {
  status: "won" | "requested" | "paid";
  userId: string;
  amountGhs: number;
  momoNetwork: string | null;
  momoNumber: string | null;
  accountName: string | null;
  requestedAt: string | null;
  paidAt: string | null;
  note: string | null;
}
interface Board {
  month: string;
  prizeGhs: number;
  endsAt: string;
  ended: boolean;
  prize: Prize | null;
  top: Row[];
}

const GAME = "beat-breaker";

function months(count = 6) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(m.toISOString().slice(0, 7));
  }
  return out;
}
const label = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "");

/** Beat Breaker monthly prize: the board with contact details, the winner's withdrawal, payout and disqualifying. */
export function GamePrizeAdmin() {
  const [month, setMonth] = useState(months()[0]);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setBoard(await adminGet<Board>(`/games/${GAME}/leaderboard?month=${month}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, failMsg: string) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : failMsg);
    } finally {
      setBusy(false);
    }
  }

  function markPaid(row: Row) {
    const p = board?.prize;
    const to = p?.momoNumber ? ` to ${p.momoNetwork} ${p.momoNumber} (${p.accountName})` : "";
    const note = prompt(`Record GH₵${board?.prizeGhs} paid to ${row.name}${to}? Add a note (e.g. MoMo transaction ID):`, "");
    if (note === null) return;
    void run(() => adminPost(`/games/${GAME}/prize`, { month, userId: row.userId, note }), "Couldn't record the payout");
  }

  function toggleDisqualified(row: Row) {
    const dq = !row.disqualified;
    const msg = dq
      ? `Disqualify ${row.name} (${row.score} pts) for ${label(month)}? Their score is hidden from the board${
          board?.ended ? " and the prize moves to the next player, who is emailed" : ""
        }.`
      : `Put ${row.name}'s score back on the board?`;
    if (!confirm(msg)) return;
    void run(() => adminPost(`/games/${GAME}/disqualify`, { month, userId: row.userId, disqualified: dq }), "Couldn't update the player");
  }

  const p = board?.prize;
  const winner = board?.top.find((r) => r.userId === p?.userId);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Beat Breaker prize</h2>
          <p className="text-sm text-neutral-400">
            Top score each month wins GH₵{board?.prizeGhs ?? 500}. When the month ends the winner is emailed to withdraw it to Mobile
            Money. Check their score looks genuine (score, levels, number of runs), send the money, then click Mark paid.
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

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {board && (
        <>
          <div className="card mb-4 p-4 text-sm text-neutral-300">
            {!board.ended ? (
              <>Still running — ends {new Date(board.endsAt).toLocaleString("en-GB", { timeZone: "UTC" })} GMT.</>
            ) : !p ? (
              <>This month has finished{board.top.length ? "" : " — nobody played"}.</>
            ) : p.status === "paid" ? (
              <>
                ✓ Prize paid to <b className="text-white">{winner?.name ?? "the winner"}</b> on {when(p.paidAt)}
                {p.note ? ` — ${p.note}` : ""}
              </>
            ) : p.status === "requested" ? (
              <>
                💸 <b className="text-white">{winner?.name ?? "The winner"}</b> asked to withdraw on {when(p.requestedAt)}:{" "}
                <b className="text-white">
                  {p.momoNetwork} {p.momoNumber}
                </b>{" "}
                ({p.accountName}). Send GH₵{p.amountGhs}, then click <b>Mark paid</b>.
              </>
            ) : (
              <>
                🏆 <b className="text-white">{winner?.name ?? "The winner"}</b> has been emailed — waiting for them to give their Mobile
                Money number. You can also pay them directly and click <b>Mark paid</b>.
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
                  {board.top.map((r, i) => {
                    const isWinner = p?.userId === r.userId;
                    return (
                      <tr
                        key={r.userId || `row-${i}`}
                        className={`border-t border-white/[0.05] ${r.disqualified ? "opacity-50" : r.rank === 1 ? "bg-accent/10" : ""}`}
                      >
                        <td className="px-4 py-2.5 font-bold text-white">{r.disqualified ? "—" : r.rank}</td>
                        <td className="px-4 py-2.5 text-white">
                          {r.name}
                          {r.disqualified && <span className="ml-2 text-xs text-red-400">disqualified</span>}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-300">
                          {r.email}
                          {r.phone && <span className="block text-xs text-neutral-500">{r.phone}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-white">{r.score.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.level}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.runs}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          {isWinner && p?.status === "paid" ? (
                            <span className="text-xs font-semibold text-accent">Paid</span>
                          ) : (
                            <div className="flex justify-end gap-2">
                              {board.ended && p?.status !== "paid" && r.rank === 1 && (
                                <button type="button" disabled={busy} onClick={() => markPaid(r)} className="btn-accent px-3 py-1.5 text-xs">
                                  Mark paid
                                </button>
                              )}
                              {p?.status !== "paid" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => toggleDisqualified(r)}
                                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-300 hover:border-red-400 hover:text-red-300"
                                >
                                  {r.disqualified ? "Restore" : "Disqualify"}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
