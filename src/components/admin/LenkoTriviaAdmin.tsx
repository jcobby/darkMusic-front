"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminDelete, adminGet, adminPatch, adminPost, adminPut } from "@/lib/adminApi";
import { sessionWhen } from "@/lib/trivia";

interface Settings {
  open: boolean;
  sessionStartsAt: string | null; // ISO
  sessionMinutes: number;
  seconds: number;
  prizeGhs: number;
  requireConfirmedEmail: boolean;
}
interface Question {
  id: string;
  text: string;
  answers: string[];
  songAnswers: string[]; // a lyric question: accepted song titles (empty: no song part)
  active: boolean;
  asked: number;
  correct: number;
}
interface Winner {
  id: string;
  month: string; // "YYYY-MM" — the month whose prize they share
  round: number;
  name: string;
  email: string | null;
  phone: string | null;
  emailConfirmed: boolean;
  question: string;
  answer: string;
  songAnswer: string | null;
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
    songAnswer: string | null;
    result: "pending" | "correct" | "wrong" | "unanswered";
    seconds: number | null;
    overridden: boolean;
    sharedNetwork: boolean;
  }[];
}
interface TriviaAdminData {
  settings: Settings;
  session: { status: "none" | "upcoming" | "open" | "over"; startsAt: string | null; endsAt: string | null };
  totals: { rounds: number; attempts: number; correct: number; wrong: number; unanswered: number; live: number };
  questions: Question[];
  winners: Winner[];
  rounds: Round[];
}

const ghs = (n: number) => `GH₵${n.toLocaleString()}`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** Right answers by month, newest month first. */
function byMonth(winners: Winner[]) {
  const groups = new Map<string, Winner[]>();
  for (const w of winners) groups.set(w.month, [...(groups.get(w.month) ?? []), w]);
  return [...groups].map(([month, list]) => ({ month, list, paid: list.reduce((sum, w) => sum + (w.paidGhs ?? 0), 0) }));
}
const RESULT = {
  correct: { label: "✓ Right", cls: "bg-emerald-500/15 text-emerald-300" },
  wrong: { label: "✗ Wrong", cls: "bg-white/5 text-neutral-300" },
  unanswered: { label: "⏱ No answer", cls: "bg-white/5 text-neutral-400" },
  pending: { label: "Live", cls: "bg-accent/20 text-white" },
} as const;

const SESSION_LABEL = { none: "Not set", upcoming: "Coming up", open: "Open now", over: "Over" } as const;

/** Lenko Trivia: the session and settings, the question bank, right answers (for the prize) and recent sessions. */
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
    const id = setInterval(load, 10000); // during a session, answers come in by the second
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

      {/* Session + totals */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="This month's exam"
          value={s.open ? SESSION_LABEL[data.session.status] : "Paused"}
          note={data.session.startsAt && data.session.endsAt ? sessionWhen(data.session.startsAt, data.session.endsAt) : undefined}
        />
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
          Each member gets one question per session, one they&apos;ve never had. With one live question everyone gets it; with several, they&apos;re
          shared out so neighbours mostly get different ones. Switch off old questions before a session. Answers are marked right when they match an
          accepted answer (ignoring capitals, punctuation and a leading &ldquo;the&rdquo;, and allowing one wrong letter in longer answers). Add every
          spelling you&apos;d accept.
          {activeCount === 0 && (
            <b className="text-yellow-300">
              {" "}
              None switched on — that&apos;s fine: when the exam opens it uses the questions no earlier exam has asked (or, if every one has been asked,
              all of them). Switch some on only to choose exactly which go out.
            </b>
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
          Everyone who got their question right, by month. When a month ends, share its {ghs(s.prizeGhs)} among that month&apos;s list and record each
          payment. ⚠ marks are worth a look before paying: a player on the same network as someone else in their round (could be one person on two
          accounts), an unconfirmed email, or a result you changed by hand.
        </p>
        {data.winners.length === 0 ? (
          <p className="card mt-3 p-6 text-center text-sm text-neutral-500">No right answers yet.</p>
        ) : (
          byMonth(data.winners).map((g) => (
            <div key={g.month} className="mt-4">
              <h3 className="text-sm font-semibold text-white">
                {monthLabel(g.month)}
                <span className="font-normal text-neutral-400">
                  {" "}
                  · {g.list.length} right answer{g.list.length === 1 ? "" : "s"} · {ghs(g.paid)} paid
                  {g.month === new Date().toISOString().slice(0, 7) && " · still running"}
                </span>
              </h3>
              <ul className="mt-2 space-y-2">
                {g.list.map((w) => (
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
                            const amount = prompt(`How much did you pay ${w.name}? (GH₵) — they get a text if their account has a phone number`, "");
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
                      {w.songAnswer && <span className="text-neutral-400"> · song: {w.songAnswer}</span>}
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
            </div>
          ))
        )}
      </section>

      {/* Rounds */}
      <section>
        <h2 className="text-lg font-bold text-white">Recent rounds</h2>
        {data.rounds.length === 0 ? (
          <p className="card mt-3 p-6 text-center text-sm text-neutral-500">No sessions played yet — each session shows here as a round once members start their questions.</p>
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
                        {a.songAnswer && <span className="text-neutral-300"> · {a.songAnswer}</span>}
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
  const num = (k: "sessionMinutes" | "seconds" | "prizeGhs") => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }));
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
        On (untick to pause the game)
      </label>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="tv-start">
          Move this month&apos;s exam — Ghana time (GMT)
        </label>
        <div className="flex gap-2">
          <input
            id="tv-start"
            type="datetime-local"
            className="input"
            // Ghana time is GMT, so the box shows (and saves) UTC
            value={form.sessionStartsAt ? form.sessionStartsAt.slice(0, 16) : ""}
            onChange={(e) => setForm((f) => ({ ...f, sessionStartsAt: e.target.value ? `${e.target.value}:00.000Z` : null }))}
          />
          {form.sessionStartsAt && (
            <button type="button" onClick={() => setForm((f) => ({ ...f, sessionStartsAt: null }))} className="btn-outline shrink-0 px-3 text-xs">
              Clear
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Leave empty: the exam is on the last day of every month at 12:00. A time here moves just the exam in that month. Moving it after members
          have played starts a new session — everyone can play again.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="tv-len">
          Session length (minutes)
        </label>
        <input id="tv-len" type="number" min={1} max={240} className="input" value={form.sessionMinutes} onChange={num("sessionMinutes")} />
      </div>
      <div>
        <label className="label" htmlFor="tv-sec">
          Seconds to answer (from the tap)
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

function QuestionForm({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (q: { text: string; answers: string; songAnswers: string; active: boolean }) => Promise<unknown> | void;
}) {
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState("");
  const [songAnswers, setSongAnswers] = useState("");
  const [active, setActive] = useState(true);
  return (
    <form
      className="card mt-4 grid gap-3 p-5 sm:grid-cols-3"
      onSubmit={async (e: FormEvent) => {
        e.preventDefault();
        await onSave({ text, answers, songAnswers, active });
        setText("");
        setAnswers("");
        setSongAnswers("");
      }}
    >
      <div>
        <label className="label" htmlFor="tv-q">
          New question
        </label>
        <textarea
          id="tv-q"
          rows={3}
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          placeholder="Complete the lyrics and name the song: “Man ah ___ ganja ___ Rasta”"
        />
      </div>
      <div>
        <label className="label" htmlFor="tv-a">
          Accepted answers — one per line
        </label>
        <textarea id="tv-a" rows={3} className="input" value={answers} onChange={(e) => setAnswers(e.target.value)} required placeholder={"half undercover"} />
      </div>
      <div>
        <label className="label" htmlFor="tv-s">
          Song title — only for lyric questions
        </label>
        <textarea
          id="tv-s"
          rows={3}
          className="input"
          value={songAnswers}
          onChange={(e) => setSongAnswers(e.target.value)}
          placeholder={"Accra Is the City\n(leave empty if they don't name a song)"}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
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
  onSave: (patch: Partial<{ text: string; answers: string; songAnswers: string; active: boolean }>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.text);
  const [answers, setAnswers] = useState(q.answers.join("\n"));
  const [songAnswers, setSongAnswers] = useState(q.songAnswers.join("\n"));
  useEffect(() => {
    if (!editing) {
      setText(q.text);
      setAnswers(q.answers.join("\n"));
      setSongAnswers(q.songAnswers.join("\n"));
    }
  }, [q, editing]);
  return (
    <li className={`card p-4 ${q.active ? "" : "opacity-60"}`}>
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <textarea rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)} aria-label="Question" />
          <textarea rows={3} className="input" value={answers} onChange={(e) => setAnswers(e.target.value)} aria-label="Accepted answers, one per line" />
          <textarea
            rows={3}
            className="input"
            value={songAnswers}
            onChange={(e) => setSongAnswers(e.target.value)}
            aria-label="Song title, one spelling per line (empty: no song part)"
            placeholder="Song title (lyric questions)"
          />
          <div className="flex gap-2 sm:col-span-3">
            <button
              type="button"
              disabled={busy}
              className="btn-accent px-4 py-2"
              onClick={() => {
                onSave({ text, answers, songAnswers });
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
              {q.songAnswers.map((a) => (
                <span key={`song-${a}`} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent-soft">
                  🎵 {a}
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
