"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet, adminPost } from "@/lib/adminApi";

interface Row {
  rank: number;
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
  endsAt: string;
  ended: boolean;
  paid: { userId: string; paidAt: string; note: string | null } | null;
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

/** Beat Breaker monthly prize: the leaderboard with contact details, and recording the payout. */
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

  async function markPaid(row: Row) {
    const note = prompt(`Record GH₵${board?.prizeGhs} paid to ${row.name}? Add a note (e.g. MoMo reference):`, "");
    if (note === null) return;
    setBusy(true);
    try {
      await adminPost(`/games/${GAME}/prize`, { month, userId: row.userId, note });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record the payout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Beat Breaker prize</h2>
          <p className="text-sm text-neutral-400">
            Top score each month wins GH₵{board?.prizeGhs ?? 500}. Check the winner looks genuine (score, levels, number of runs) before paying.
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
          <p className="mb-4 text-sm text-neutral-300">
            {board.paid
              ? `✓ Prize paid on ${new Date(board.paid.paidAt).toLocaleDateString("en-GB")}${board.paid.note ? ` — ${board.paid.note}` : ""}`
              : board.ended
              ? "This month has finished — pay the winner, then record it here."
              : `Still running — ends ${new Date(board.endsAt).toLocaleString("en-GB", { timeZone: "UTC" })} GMT.`}
          </p>
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
                  {board.top.map((r) => (
                    <tr key={r.userId} className={`border-t border-white/[0.05] ${r.rank === 1 ? "bg-accent/10" : ""}`}>
                      <td className="px-4 py-2.5 font-bold text-white">{r.rank}</td>
                      <td className="px-4 py-2.5 text-white">{r.name}</td>
                      <td className="px-4 py-2.5 text-neutral-300">
                        {r.email}
                        {r.phone && <span className="block text-xs text-neutral-500">{r.phone}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-white">{r.score.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.level}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.runs}</td>
                      <td className="px-4 py-2.5 text-right">
                        {board.paid?.userId === r.userId ? (
                          <span className="text-xs font-semibold text-accent">Paid</span>
                        ) : board.ended && !board.paid && r.rank === 1 ? (
                          <button type="button" disabled={busy} onClick={() => markPaid(r)} className="btn-accent px-3 py-1.5 text-xs">
                            Mark paid
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
