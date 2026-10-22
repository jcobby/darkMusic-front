"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminDelete, adminGet, adminPatch, adminPost, adminPut } from "@/lib/adminApi";

interface Settings {
  open: boolean;
  minPlayers: number;
  seconds: number;
  prizeGhs: number;
  requireConfirmedEmail: boolean;
}
interface Question {
  id: string;
  text: string;
  answers: string[];
  active: boolean;
  asked: number;
  correct: number;
}
interface Winner {
  id: string;
  round: number;
  name: string;
  email: string | null;
  phone: string | null;
  emailConfirmed: boolean;
  question: string;
  answer: string;
  seconds: number | null;
  at: string;
  overridden: boolean;
  sharedNetwork: boolean;
  paidGhs: number | null;
  paidNote: string | null;
  paidAt: string | null;
}
interface Round {
  number: number;
  startedAt: string;
  endsAt: string;
  players: number;
  attempts: {
    id: string;
    name: string;
    question: string;
    answer: string | null;
    result: "pending" | "correct" | "wrong" | "unanswered";
    seconds: number | null;
    overridden: boolean;
    sharedNetwork: boolean;
  }[];
}
interface TriviaAdminData {
  settings: Settings;
  lobby: { ready: number; names: string[] };
  totals: { rounds: number; attempts: number; correct: number; wrong: number; unanswered: number; live: number };
  questions: Question[];
  winners: Winner[];
  rounds: Round[];
}

const ghs = (n: number) => `GH₵${n.toLocaleString()}`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
const RESULT = {
  correct: { label: "✓ Right", cls: "bg-emerald-500/15 text-emerald-300" },
  wrong: { label: "✗ Wrong", cls: "bg-white/5 text-neutral-300" },
  unanswered: { label: "⏱ No answer", cls: "bg-white/5 text-neutral-400" },
  pending: { label: "Live", cls: "bg-accent/20 text-white" },
} as const;

/** Lenko Trivia: lobby and settings, the question bank, right answers (for the prize) and recent rounds. */
export function LenkoTriviaAdmin() {
  const [data, setData] = useState<TriviaAdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await adminGet<TriviaAdminData>("/trivia"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load Lenko Trivia");
    }
  }, []);
  useEffect(() => {
    void load();
    const id = setInterval(load, 10000); // the lobby changes by the second
    return () => clearInterval(id);
  }, [load]);

  async function run(fn: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await fn();
      if (done) setMsg(done);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <p className="text-sm text-red-400">{error}</p> : <p className="text-sm text-neutral-500">Loading…</p>;
  const s = data.settings;
  const activeCount = data.questions.filter((q) => q.active).length;

  return (
    <div className="space-y-8">
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {msg && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{msg}</p>}

      {/* Lobby + totals */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Ready right now" value={`${data.lobby.ready} / ${s.minPlayers}`} note={data.lobby.names.join(", ") || (s.open ? "nobody waiting" : "paused")} />
        <Stat label="Rounds" value={String(data.totals.rounds)} note={data.totals.live ? `${data.totals.live} answering now` : undefined} />
        <Stat label="Right answers" value={String(data.totals.correct)} />
        <Stat label="Wrong" value={String(data.totals.wrong)} />
        <Stat label="No answer in time" value={String(data.totals.unanswered)} />
      </div>

      <SettingsForm settings={s} busy={busy} onSave={(next) => run(() => adminPut("/trivia/settings", next), "Settings saved.")} />

      {/* Questions */}
      <section>
        <h2 className="text-lg font-bold text-white">
          Questions <span className="text-sm font-normal text-neutral-400">({activeCount} live of {data.questions.length})</span>
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          Each player gets one question they&apos;ve never had. Answers are marked right when they match an accepted answer (ignoring capitals,
          punctuation and a leading &ldquo;the&rdquo;, and allowing one wrong letter in longer answers). Add every spelling you&apos;d accept.
          {activeCount < s.minPlayers && (
            <b className="text-yellow-300"> Add at least {s.minPlayers} live questions so a full round gets different ones.</b>
          )}
        </p>
        <QuestionForm busy={busy} onSave={(q) => run(() => adminPost("/trivia/questions", q), "Question added.")} />
        <ul className="mt-4 space-y-2">
          {data.questions.map((q) => (
            <QuestionRow
              key={q.id}
              q={q}
              busy={busy}
              onSave={(patch) => run(() => adminPut(`/trivia/questions/${q.id}`, patch), "Question saved.")}
              onDelete={() => {
                if (confirm("Delete this question?")) void run(() => adminDelete(`/trivia/questions/${q.id}`), "Question deleted.");
              }}
            />
          ))}
        </ul>
      </section>

      {/* Right answers → prize */}
      <section>
        <h2 className="text-lg font-bold text-white">
          Right answers — for the {ghs(s.prizeGhs)} prize <span className="text-sm font-normal text-neutral-400">({data.winners.length})</span>
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          Everyone who got their question right, newest first. ⚠ marks are worth a look before paying: a player on the same network as someone else in
          their round (could be one person on two accounts), an unconfirmed email, or a result you changed by hand.
        </p>
        {data.winners.length === 0 ? (
          <p className="card mt-3 p-6 text-center text-sm text-neutral-500">No right answers yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.winners.map((w) => (
              <li key={w.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      {w.name} <span className="text-xs font-normal text-neutral-400">· round {w.round} · {when(w.at)}{w.seconds !== null && ` · ${w.seconds}s`}</span>
                    </p>
                    <p className="text-xs text-neutral-400">
                      {w.email && (
                        <a href={`mailto:${w.email}`} className="underline">
                          {w.email}
                        </a>
                      )}
                      {w.phone && ` · ${w.phone}`}
                    </p>
                  </div>
                  {w.paidGhs !== null ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      Paid {ghs(w.paidGhs)}
                      {w.paidNote && ` · ${w.paidNote}`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const amount = prompt(`How much did you pay ${w.name}? (GH₵)`, "");
                        if (amount === null || amount.trim() === "") return;
                        const note = prompt("Payment note (e.g. MoMo transaction ID):", "") ?? "";
                        void run(() => adminPatch(`/trivia/attempts/${w.id}`, { paidGhs: Number(amount), paidNote: note }), "Payment recorded.");
                      }}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:border-accent hover:text-white"
                    >
                      Record payment
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-neutral-300">
                  <span className="text-neutral-500">Q:</span> {w.question}
                </p>
                <p className="text-sm text-white">
                  <span className="text-neutral-500">Their answer:</span> {w.answer || "—"}
                </p>
                {(w.sharedNetwork || !w.emailConfirmed || w.overridden) && (
                  <p className="mt-2 text-xs text-yellow-300">
                    {w.sharedNetwork && "⚠ Same network as another player in this round. "}
                    {!w.emailConfirmed && "⚠ Email not confirmed. "}
                    {w.overridden && "⚠ Marked right by hand."}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rounds */}
      <section>
        <h2 className="text-lg font-bold text-white">Recent rounds</h2>
        {data.rounds.length === 0 ? (
          <p className="card mt-3 p-6 text-center text-sm text-neutral-500">No rounds yet — one starts when {s.minPlayers} players are ready at the same time.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {data.rounds.map((r) => (
              <details key={r.number} className="card p-4" open={r === data.rounds[0]}>
                <summary className="cursor-pointer text-sm text-white">
                  <b>Round {r.number}</b> · {when(r.startedAt)} · {r.players} players ·{" "}
                  {r.attempts.filter((a) => a.result === "correct").length} right
                </summary>
                <ul className="mt-3 divide-y divide-white/[0.05]">
                  {r.attempts.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RESULT[a.result].cls}`}>{RESULT[a.result].label}</span>
                      <span className="font-semibold text-white">{a.name}</span>
                      <span className="min-w-0 flex-1 text-neutral-400">
                        {a.question} → <span className="text-neutral-200">{a.answer ?? "—"}</span>
                        {a.seconds !== null && ` (${a.seconds}s)`}
                        {a.sharedNetwork && <span className="text-yellow-300"> ⚠ shared network</span>}
                        {a.overridden && <span className="text-yellow-300"> · changed by hand</span>}
                      </span>
                      {a.result === "correct" ? (
                        <button type="button" disabled={busy} onClick={() => run(() => adminPatch(`/trivia/attempts/${a.id}`, { result: "wrong" }), "Marked wrong.")} className="text-xs text-neutral-400 underline hover:text-white">
                          Mark wrong
                        </button>
                      ) : a.result !== "pending" ? (
                        <button type="button" disabled={busy} onClick={() => run(() => adminPatch(`/trivia/attempts/${a.id}`, { result: "correct" }), "Marked right.")} className="text-xs text-neutral-400 underline hover:text-white">
                          Mark right
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
      {note && <p className="mt-0.5 truncate text-xs text-neutral-400">{note}</p>}
    </div>
  );
}

function SettingsForm({ settings, busy, onSave }: { settings: Settings; busy: boolean; onSave: (s: Settings) => void }) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  const num = (k: "minPlayers" | "seconds" | "prizeGhs") => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }));
  return (
    <form
      className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <label className="flex items-center gap-2 text-sm text-white sm:col-span-2 lg:col-span-4">
        <input type="checkbox" checked={form.open} onChange={(e) => setForm((f) => ({ ...f, open: e.target.checked }))} />
        Open — members can join the lobby (untick to pause the game)
      </label>
      <div>
        <label className="label" htmlFor="tv-min">
          Players needed at once
        </label>
        <input id="tv-min" type="number" min={2} max={500} className="input" value={form.minPlayers} onChange={num("minPlayers")} />
      </div>
      <div>
        <label className="label" htmlFor="tv-sec">
          Seconds to answer
        </label>
        <input id="tv-sec" type="number" min={20} max={600} className="input" value={form.seconds} onChange={num("seconds")} />
      </div>
      <div>
        <label className="label" htmlFor="tv-prize">
          Prize pool (GH₵)
        </label>
        <input id="tv-prize" type="number" min={0} className="input" value={form.prizeGhs} onChange={num("prizeGhs")} />
      </div>
      <label className="flex items-center gap-2 self-end pb-3 text-sm text-neutral-200">
        <input type="checkbox" checked={form.requireConfirmedEmail} onChange={(e) => setForm((f) => ({ ...f, requireConfirmedEmail: e.target.checked }))} />
        Players must have confirmed their email
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        <button type="submit" disabled={busy} className="btn-accent">
          Save settings
        </button>
      </div>
    </form>
  );
}

function QuestionForm({ busy, onSave }: { busy: boolean; onSave: (q: { text: string; answers: string; active: boolean }) => Promise<unknown> | void }) {
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState("");
  const [active, setActive] = useState(true);
  return (
    <form
      className="card mt-4 grid gap-3 p-5 sm:grid-cols-2"
      onSubmit={async (e: FormEvent) => {
        e.preventDefault();
        await onSave({ text, answers, active });
        setText("");
        setAnswers("");
      }}
    >
      <div>
        <label className="label" htmlFor="tv-q">
          New question
        </label>
        <textarea id="tv-q" rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)} required placeholder="Who produced Stubborn Abele?" />
      </div>
      <div>
        <label className="label" htmlFor="tv-a">
          Accepted answers — one per line
        </label>
        <textarea id="tv-a" rows={3} className="input" value={answers} onChange={(e) => setAnswers(e.target.value)} required placeholder={"Roddy Hanz\nRoddy"} />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-neutral-200">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Live (players can get it)
        </label>
        <button type="submit" disabled={busy} className="btn-accent">
          Add question
        </button>
      </div>
    </form>
  );
}

function QuestionRow({
  q,
  busy,
  onSave,
  onDelete,
}: {
  q: Question;
  busy: boolean;
  onSave: (patch: Partial<{ text: string; answers: string; active: boolean }>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.text);
  const [answers, setAnswers] = useState(q.answers.join("\n"));
  useEffect(() => {
    if (!editing) {
      setText(q.text);
      setAnswers(q.answers.join("\n"));
    }
  }, [q, editing]);
  return (
    <li className={`card p-4 ${q.active ? "" : "opacity-60"}`}>
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <textarea rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)} aria-label="Question" />
          <textarea rows={3} className="input" value={answers} onChange={(e) => setAnswers(e.target.value)} aria-label="Accepted answers, one per line" />
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              className="btn-accent px-4 py-2"
              onClick={() => {
                onSave({ text, answers });
                setEditing(false);
              }}
            >
              Save
            </button>
            <button type="button" className="btn-outline px-4 py-2" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{q.text}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {q.answers.map((a) => (
                <span key={a} className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-200">
                  {a}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">
              Given {q.asked} time{q.asked === 1 ? "" : "s"} · right {q.correct}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSave({ active: !q.active })}
              className={`rounded-full px-3 py-1.5 font-semibold ${q.active ? "bg-emerald-500/15 text-emerald-300" : "border border-white/15 text-neutral-300"}`}
            >
              {q.active ? "● Live" : "Off — switch on"}
            </button>
            <button type="button" onClick={() => setEditing(true)} className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-200 hover:text-white">
              Edit
            </button>
            {q.asked === 0 && (
              <button type="button" disabled={busy} onClick={onDelete} className="text-neutral-500 hover:text-red-400">
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
