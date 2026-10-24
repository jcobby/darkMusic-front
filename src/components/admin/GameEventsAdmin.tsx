"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminGet, adminPost, adminPut } from "@/lib/adminApi";
import { eventTime, gameName, prizeLine, scoringLine } from "@/lib/events";
import type { GameEventInfo } from "@/lib/api";
import { site } from "@/config/site";
import { BeatOfDayAdmin } from "./BeatOfDayAdmin";
import { SquadsAdmin } from "./SquadsAdmin";

interface AdminEvent extends GameEventInfo {
  id: string;
  split: number[];
  cancelled: boolean;
  settledAt: string | null;
  players: number;
}
interface EventBoard {
  event: AdminEvent;
  top: {
    rank: number | null;
    disqualified: boolean;
    userId: string;
    name: string;
    email: string | null;
    phone: string | null;
    score: number;
    level: number;
    days: number | null;
    runs: number;
  }[];
  prizes: { userId: string; place: number | null; amountGhs: number; status: string; availableAt: string | null }[];
}

interface Form {
  id: string | null; // editing this one
  title: string;
  description: string;
  game: "beat-breaker" | "pool";
  kind: "live" | "weekly";
  metric: "best" | "days" | "wins"; // Pool: always wins
  startsAt: string; // "YYYY-MM-DDTHH:mm", Ghana time (GMT)
  endsAt: string;
  prizeGhs: string;
  split: string; // "60, 25, 15"
}

// Times are typed and shown in Ghana time (GMT = UTC), whatever this computer's clock zone.
const toInput = (d: Date) => d.toISOString().slice(0, 16);
const fromInput = (v: string) => new Date(`${v}:00Z`).toISOString();
const money = (n: number) => `GH₵${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/** Tonight 8–9pm GMT (tomorrow's if it's already over). */
function tonight(): Partial<Form> {
  const d = new Date();
  let start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 20);
  if (start + 3600e3 <= Date.now()) start += 86400e3;
  return { kind: "live", metric: "best", startsAt: toInput(new Date(start)), endsAt: toInput(new Date(start + 3600e3)) };
}
/** Next Monday 00:00 → the Monday after (a full week). */
function nextWeek(): Partial<Form> {
  const d = new Date();
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const monday = today + (((8 - d.getUTCDay()) % 7) || 7) * 86400e3;
  return { kind: "weekly", startsAt: toInput(new Date(monday)), endsAt: toInput(new Date(monday + 7 * 86400e3)) };
}
const blank = (): Form => ({
  id: null,
  title: "",
  description: "",
  game: "beat-breaker",
  kind: "live",
  metric: "best",
  startsAt: "",
  endsAt: "",
  prizeGhs: "100",
  split: "60, 25, 15",
  ...tonight(),
});

const STATUS: Record<GameEventInfo["status"], string> = {
  upcoming: "bg-white/10 text-white",
  live: "bg-yellow-400 text-ink",
  ended: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-white/5 text-neutral-500",
};

/** Weekly challenges and live mini-tournaments: schedule them, watch their boards, check the winners. */
export function GameEventsAdmin() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [board, setBoard] = useState<EventBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await adminGet<AdminEvent[]>("/events"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const openBoard = useCallback(async (id: string) => {
    try {
      setBoard(await adminGet<EventBoard>(`/events/${id}/board`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the board");
    }
  }, []);

  async function run(action: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await action();
      setNotice(okMsg);
      await load();
      if (board) await openBoard(board.event.id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.startsAt || !form.endsAt) return setError("Set when it starts and ends");
    const body = {
      title: form.title,
      description: form.description,
      game: form.game,
      kind: form.kind,
      metric: form.game === "pool" ? "wins" : form.metric,
      startsAt: fromInput(form.startsAt),
      endsAt: fromInput(form.endsAt),
      prizeGhs: Number(form.prizeGhs) || 0,
      split: form.split,
    };
    const ok = await run(
      () => (form.id ? adminPut(`/events/${form.id}`, body) : adminPost("/events", body)),
      form.id ? "Event updated." : "Event scheduled — share its page on X."
    );
    if (ok) setForm(blank());
  }

  function edit(ev: AdminEvent) {
    setForm({
      id: ev.id,
      title: ev.title,
      description: ev.description ?? "",
      game: ev.game === "pool" ? "pool" : "beat-breaker",
      kind: ev.kind,
      metric: ev.metric,
      startsAt: toInput(new Date(ev.startsAt)),
      endsAt: toInput(new Date(ev.endsAt)),
      prizeGhs: String(ev.prizeGhs),
      split: ev.split.join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancel(ev: AdminEvent) {
    if (!confirm(`Cancel ${ev.title}? Nothing will be paid, and it disappears from the site.`)) return;
    void run(() => adminPost(`/events/${ev.id}/cancel`, {}), "Event cancelled.");
  }

  function toggleDisqualified(row: EventBoard["top"][number]) {
    if (!board) return;
    const dq = !row.disqualified;
    const paid = Boolean(board.event.settledAt);
    if (!confirm(dq ? `Disqualify ${row.name} from ${board.event.title}?${paid ? " Prizes move down the board (players are emailed)." : ""}` : `Put ${row.name} back on the board?`)) return;
    void run(() => adminPost(`/events/${board.event.id}/disqualify`, { userId: row.userId, disqualified: dq }), dq ? "Disqualified." : "Restored.");
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const started = Boolean(form.id && events.find((x) => x.id === form.id && x.status !== "upcoming"));
  const prize = Number(form.prizeGhs) || 0;
  const splitNums = form.split.split(/[\s,/]+/).map(Number).filter((x) => x > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">⚡ Game events</h2>
        <p className="text-sm text-neutral-400">
          Weekly challenges and live mini-tournaments for Beat Breaker and DMY Pool. Each has its own board; when it ends, its prizes go into the winners&apos; DMY
          wallets for the 48-hour score check (make sure your Paystack balance covers them). Post the event&apos;s page on X to announce it.
        </p>
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}

      {/* ---- Schedule / edit ---- */}
      <form onSubmit={save} className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-white">{form.id ? `Edit ${form.title}` : "Schedule an event"}</h3>
          {!form.id && (
            <div className="flex flex-wrap gap-2 text-xs">
              <button type="button" onClick={() => set({ ...tonight(), title: form.title || "Tonight's Beat Breaker showdown" })} className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-300 hover:text-white">
                Tonight 8–9pm
              </button>
              <button type="button" onClick={() => set({ ...nextWeek(), title: form.title || "Weekly challenge" })} className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-300 hover:text-white">
                Next week Mon–Sun
              </button>
            </div>
          )}
        </div>
        {started && <p className="text-xs text-yellow-300">It has started — only the title and description can change now.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-neutral-400 sm:col-span-2">
            Title
            <input className="input mt-1" value={form.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} required placeholder="Friday Night Breaker" />
          </label>
          <label className="text-xs text-neutral-400 sm:col-span-2">
            Description (optional — shown on its page)
            <textarea className="input mt-1" rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} maxLength={600} />
          </label>
          <label className="text-xs text-neutral-400">
            Game
            <select
              className="input mt-1"
              value={form.game}
              disabled={started}
              onChange={(e) => {
                const game = e.target.value as Form["game"];
                set({ game, metric: game === "pool" ? "wins" : "best" });
              }}
            >
              <option value="beat-breaker">Beat Breaker</option>
              <option value="pool">DMY Pool</option>
            </select>
          </label>
          <label className="text-xs text-neutral-400">
            Type
            <select className="input mt-1" value={form.kind} disabled={started} onChange={(e) => set({ kind: e.target.value as Form["kind"] })}>
              <option value="live">Live event (a short window)</option>
              <option value="weekly">Weekly challenge</option>
            </select>
          </label>
          <label className="text-xs text-neutral-400 sm:col-span-2">
            Scored by
            {form.game === "pool" ? (
              <select className="input mt-1" value="wins" disabled>
                <option value="wins">Most ranked wins</option>
              </select>
            ) : (
              <select className="input mt-1" value={form.metric} disabled={started} onChange={(e) => set({ metric: e.target.value as Form["metric"] })}>
                <option value="best">Highest single game</option>
                <option value="days">Best game each day, added up</option>
              </select>
            )}
          </label>
          <label className="text-xs text-neutral-400">
            Starts (Ghana time / GMT)
            <input type="datetime-local" className="input mt-1" value={form.startsAt} disabled={started} onChange={(e) => set({ startsAt: e.target.value })} required />
          </label>
          <label className="text-xs text-neutral-400">
            Ends (Ghana time / GMT)
            <input type="datetime-local" className="input mt-1" value={form.endsAt} disabled={started} onChange={(e) => set({ endsAt: e.target.value })} required />
          </label>
          <label className="text-xs text-neutral-400">
            Prize (GH₵, 0 = bragging rights)
            <input type="number" min={0} step="0.01" className="input mt-1" value={form.prizeGhs} disabled={started} onChange={(e) => set({ prizeGhs: e.target.value })} />
          </label>
          <label className="text-xs text-neutral-400">
            Split (% for 1st, 2nd, 3rd…)
            <input className="input mt-1" value={form.split} disabled={started || prize <= 0} onChange={(e) => set({ split: e.target.value })} placeholder="60, 25, 15 — or 100" />
          </label>
        </div>
        {prize > 0 && splitNums.length > 0 && (
          <p className="text-xs text-neutral-400">
            Pays {splitNums.map((p, i) => `${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} ${money(Math.round(prize * p) / 100)}`).join(" · ")}
            {Math.abs(splitNums.reduce((s, x) => s + x, 0) - 100) > 0.01 && <span className="text-red-300"> — the split must add up to 100%</span>}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn-accent min-h-[44px]">
            {form.id ? "Save changes" : "Schedule it"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(blank())} className="btn-outline min-h-[44px]">
              Stop editing
            </button>
          )}
        </div>
      </form>

      {/* ---- Events ---- */}
      <section className="card p-5">
        <h3 className="mb-3 font-semibold text-white">Events</h3>
        {events.length === 0 ? (
          <p className="text-sm text-neutral-500">No events yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {events.map((ev) => {
              const url = `${site.url}/games/events/${ev.slug}`;
              const share = `https://twitter.com/intent/tweet?${new URLSearchParams({ text: `⚡ ${ev.title} — ${gameName(ev)} on Dark Music Yard. ${prizeLine(ev)}. ${eventTime(ev.startsAt)} (GMT).`, url })}`;
              return (
                <li key={ev.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-white">
                      <span className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS[ev.status]}`}>{ev.status}</span>
                      <b>{ev.title}</b>
                    </p>
                    <p className="text-xs text-neutral-400">
                      {gameName(ev)} · {eventTime(ev.startsAt)} → {eventTime(ev.endsAt)} · {ev.kind === "live" ? "Live" : "Weekly"} · {scoringLine(ev)} · {ev.players} player
                      {ev.players === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-neutral-500">{prizeLine(ev)}{ev.settledAt ? " · paid out ✓" : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button type="button" onClick={() => (board?.event.id === ev.id ? setBoard(null) : openBoard(ev.id))} className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-300 hover:text-white">
                      {board?.event.id === ev.id ? "Hide board" : "Board"}
                    </button>
                    {!ev.cancelled && !ev.settledAt && (
                      <>
                        <button type="button" onClick={() => edit(ev)} className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-300 hover:text-white">
                          Edit
                        </button>
                        <button type="button" disabled={busy} onClick={() => cancel(ev)} className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-300 hover:border-red-400 hover:text-red-300">
                          Cancel
                        </button>
                      </>
                    )}
                    {!ev.cancelled && (
                      <>
                        <a href={`/games/events/${ev.slug}`} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-300 hover:text-white">
                          Page ↗
                        </a>
                        <a href={share} target="_blank" rel="noopener noreferrer" className="rounded-full bg-accent px-3 py-1.5 font-semibold text-white">
                          Post on X
                        </a>
                      </>
                    )}
                  </div>
                  {board?.event.id === ev.id && (
                    <div className="w-full overflow-x-auto rounded-xl border border-white/[0.06]">
                      {board.top.length === 0 ? (
                        <p className="p-4 text-xs text-neutral-500">Nobody has played yet.</p>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="text-neutral-500">
                            <tr>
                              <th className="px-3 py-2">#</th>
                              <th className="px-3 py-2">Player</th>
                              <th className="px-3 py-2">Contact</th>
                              <th className="px-3 py-2 text-right">{ev.metric === "wins" ? "Wins" : "Points"}</th>
                              {ev.metric === "days" && <th className="px-3 py-2 text-right">Days</th>}
                              <th className="px-3 py-2 text-right">Level</th>
                              <th className="px-3 py-2 text-right">Games</th>
                              <th className="px-3 py-2 text-right">Prize</th>
                              <th className="px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {board.top.map((r) => {
                              const p = board.prizes.find((x) => x.userId === r.userId && x.status !== "void");
                              return (
                                <tr key={r.userId} className={`border-t border-white/[0.05] ${r.disqualified ? "opacity-50" : ""}`}>
                                  <td className="px-3 py-2 font-bold text-white">{r.rank ?? "—"}</td>
                                  <td className="px-3 py-2 text-white">
                                    {r.name}
                                    {r.disqualified && <span className="ml-2 text-red-400">disqualified</span>}
                                  </td>
                                  <td className="px-3 py-2 text-neutral-300">
                                    {r.email}
                                    {r.phone && <span className="block text-neutral-500">{r.phone}</span>}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-white">{r.score.toLocaleString()}</td>
                                  {ev.metric === "days" && <td className="px-3 py-2 text-right tabular-nums">{r.days ?? "—"}</td>}
                                  <td className="px-3 py-2 text-right tabular-nums">{r.level}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">{r.runs}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">{p ? `${money(p.amountGhs)} · ${p.status}` : ""}</td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right">
                                    <button type="button" disabled={busy} onClick={() => toggleDisqualified(r)} className="rounded-full border border-white/15 px-3 py-1 text-neutral-300 hover:border-red-400 hover:text-red-300">
                                      {r.disqualified ? "Restore" : "Disqualify"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BeatOfDayAdmin />
      <SquadsAdmin />
    </div>
  );
}
