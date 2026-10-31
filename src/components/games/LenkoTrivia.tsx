"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  getTriviaSession,
  getTriviaState,
  resendVerification,
  startTrivia,
  submitTriviaAnswer,
  type TriviaBoard,
  type TriviaResult,
  type TriviaSession,
  type TriviaState,
} from "@/lib/api";
import { EXAM_NAME, nextExamAfter, sessionMinutes, sessionWhen } from "@/lib/trivia";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { signInHref } from "./ScoreSaveStatus";
import { TriviaBoardList } from "./TriviaBoard";

const GAME = "lenko-trivia";
const SESSION_MS = 30000; // the page re-checks the session this often (DMY may move it)

const ghs = (n: number) => `GH₵${n.toLocaleString()}`;
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
/** Time to go: "4d 21h", "3h 12m", or "12:04" in the last hour. */
const until = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${Math.floor((s % 3600) / 60)}m`;
  return clock(ms);
};
const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong — try again");

interface Live {
  attemptId: string;
  roundNumber: number;
  text: string;
  askSong: boolean; // a lyric question: the missing words and the song
  endsAt: number; // this browser's clock
  seconds: number;
}
interface Done {
  result: TriviaResult;
  roundNumber: number;
}

/**
 * Lenko Trivia — the LA End of Month Exam: the last day of every month, 12:00–12:10
 * GMT, members tap "Start my question" whenever they're ready — one question each,
 * and the clock (2 minutes) starts at that tap. One try; only their own result is
 * shown; right answers make the month's prize leaderboard. Real ones only.
 */
export function LenkoTrivia({ initialBoard, initialSession }: { initialBoard: TriviaBoard; initialSession: TriviaSession | null }) {
  const { user, loading } = useFanAuth();
  const [session, setSession] = useState<TriviaSession | null>(initialSession);
  const [state, setState] = useState<TriviaState | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const offset = useRef(0); // the server's clock − ours (set from each fresh look at the session)
  const answerEnds = useRef(0); // when their question's time is up (their right answer then shows on the board)

  const take = useCallback((s: TriviaSession) => {
    offset.current = Date.parse(s.now) - Date.now();
    setSession(s);
  }, []);

  const apply = useCallback(
    (s: TriviaState) => {
      take(s);
      setState(s);
      const m = s.mine;
      if (m?.result === "pending" && m.question && m.question.remainingMs > 0) {
        const q = m.question;
        answerEnds.current = Date.now() + q.remainingMs;
        setLive((prev) =>
          prev?.attemptId === m.attemptId
            ? prev
            : { attemptId: m.attemptId, roundNumber: m.roundNumber, text: q.text, askSong: q.askSong, endsAt: Date.now() + q.remainingMs, seconds: q.seconds }
        );
      } else {
        setLive(null);
        // Their time ran out a moment ago (the server locks it a few seconds later): no answer
        if (m) setDone({ result: m.result === "pending" ? "unanswered" : m.result, roundNumber: m.roundNumber });
      }
    },
    [take]
  );

  const refresh = useCallback(async () => {
    const token = getFanToken();
    if (!token) return null;
    try {
      const s = await getTriviaState(token);
      apply(s);
      setError(null);
      return s;
    } catch (err) {
      setError(messageOf(err));
      return null;
    }
  }, [apply]);

  // A fresh look now, then every 30 s (not while answering)
  useEffect(() => {
    if (loading || live) return;
    const look = () => (user ? void refresh() : void getTriviaSession().then(take).catch(() => {}));
    look();
    const id = setInterval(look, SESSION_MS);
    return () => clearInterval(id);
  }, [loading, user, live, refresh, take]);

  // The clock: every second for the countdowns, four times a second while answering
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), live ? 250 : 1000);
    return () => clearInterval(id);
  }, [live]);
  const remaining = live ? Math.min(live.endsAt - now, live.seconds * 1000) : 0; // `now` can be a tick behind when the question appears
  const timeUp = live !== null && remaining <= 0;

  // Time's up with nothing sent: that's "no answer" — show it straight away. The page
  // catches up with the server a few seconds later, at a random moment, so a whole
  // session of pages doesn't ask at the same instant.
  useEffect(() => {
    if (!timeUp || !live || busy) return;
    setDone({ result: "unanswered", roundNumber: live.roundNumber });
    setLive(null);
    setTimeout(() => void refresh(), 4000 + Math.random() * 4000);
  }, [timeUp, live, busy, refresh]);

  // While the question is live: countdown in the tab title, and a warning before leaving the page.
  useEffect(() => {
    if (!live) return;
    const before = document.title;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      document.title = before;
      window.removeEventListener("beforeunload", warn);
    };
  }, [live]);
  useEffect(() => {
    if (live) document.title = `⏱ ${clock(remaining)} · ${EXAM_NAME}`;
  }, [live, remaining]);

  // Once their time is up, refresh the board (a right answer appears then)
  useEffect(() => {
    if (!done) return;
    const wait = Math.max(0, answerEnds.current - Date.now()) + 12000;
    const id = setTimeout(() => setBoardKey((k) => k + 1), wait);
    return () => clearTimeout(id);
  }, [done]);

  async function start() {
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      apply(await startTrivia(token));
      setConfirming(false);
    } catch (err) {
      setError(messageOf(err));
      setConfirming(false);
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submit(answer: string, song?: string) {
    const token = getFanToken();
    if (!token || !live) return;
    setBusy(true);
    setError(null);
    try {
      const r = await submitTriviaAnswer(token, live.attemptId, answer, song);
      setDone({ result: r.result, roundNumber: live.roundNumber });
      setLive(null); // locked: stop the countdown
      const s = await getTriviaState(token).catch(() => null);
      if (s) apply(s);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  // Where the session is, by the server's clock
  const t = now + offset.current;
  const startsAt = session?.startsAt ? Date.parse(session.startsAt) : null;
  const endsAt = session?.endsAt ? Date.parse(session.endsAt) : null;
  const status = !session ? null : startsAt === null || endsAt === null ? "none" : t < startsAt ? "upcoming" : t < endsAt ? "open" : "over";
  const when = session?.startsAt && session.endsAt ? sessionWhen(session.startsAt, session.endsAt) : null;
  const seconds = session?.seconds ?? 120;
  const prize = session?.prizeGhs ?? initialBoard.prizeGhs;

  let panel: React.ReactNode;
  if (loading || (user && !state && !error)) {
    panel = <p className="py-10 text-center text-sm text-neutral-400">Loading…</p>;
  } else if (!user) {
    panel = (
      <div className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent">Members only · free</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-white">Sign in to play</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-300">
          The {EXAM_NAME} is for Dark Music Yard members — real ones only. It&apos;s free: create an account in a minute
          {when && status !== "over" ? <>, then come back on {when}.</> : "."}
        </p>
        <Link href={signInHref(GAME)} className="btn-accent mt-6 min-h-[52px] w-full max-w-xs">
          Sign in or create an account
        </Link>
      </div>
    );
  } else if (live) {
    panel = <QuestionPanel live={live} remaining={remaining} busy={busy} error={error} onSubmit={submit} />;
  } else if (done) {
    const reviewAt = state?.reviewAt ? Date.parse(state.reviewAt) : null;
    panel = <ResultPanel done={done} prizeGhs={prize} review={state?.mine?.review ?? null} reviewIn={reviewAt !== null ? reviewAt - t : null} />;
  } else if (state && !state.emailConfirmed) {
    panel = <ConfirmEmail onCheck={refresh} />;
  } else if (session && !session.open) {
    panel = (
      <div className="py-6 text-center">
        <h2 className="font-display text-2xl font-bold text-white">The exam is paused</h2>
        <p className="mt-2 text-sm text-neutral-300">Check back soon — any change will be announced on our socials.</p>
      </div>
    );
  } else if (status === "upcoming" && startsAt) {
    panel = (
      <div className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent">Next exam</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{when}</h2>
        <p className="mt-4 font-display text-5xl font-bold tabular-nums text-white">{until(startsAt - t)}</p>
        <p className="text-xs uppercase tracking-wider text-neutral-500">to go</p>
        <p className="mx-auto mt-5 max-w-sm text-sm text-neutral-300">
          Come back then and tap <b className="text-white">Start my question</b> any time before it closes. You get one question and{" "}
          <b className="text-white">{clock(seconds * 1000)}</b> from your tap.
        </p>
      </div>
    );
  } else if (status === "open" && endsAt) {
    panel = (
      <div>
        <p className="flex items-center justify-between gap-3 text-sm font-semibold text-emerald-300">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            Open now
          </span>
          <span className="tabular-nums text-neutral-300">closes in {clock(endsAt - t)}</span>
        </p>
        {state?.noQuestionsYet ? (
          <p className="mt-6 text-center text-sm text-neutral-300">The questions are going up — try again in a moment.</p>
        ) : confirming ? (
          <div className="mt-6 rounded-2xl border border-accent/40 bg-accent/10 p-4">
            <p className="text-sm text-white">
              Ready? Your <b>{clock(seconds * 1000)}</b> starts the moment you tap. One try — no changes, and no answer in time counts as wrong.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={start} disabled={busy} className="btn-accent min-h-[52px] flex-1 text-base">
                {busy ? "Starting…" : "Yes — show my question"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="btn-outline min-h-[52px]">
                Not yet
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="btn-accent mt-6 min-h-[56px] w-full text-base">
            ▶ Start my question
          </button>
        )}
        {error && !live && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}
        <p className="mt-4 text-center text-xs text-neutral-500">Tap whenever you&apos;re ready before it closes — you&apos;ll still get your full {clock(seconds * 1000)}.</p>
      </div>
    );
  } else if (status === "over") {
    panel = (
      <div className="py-6 text-center">
        <h2 className="font-display text-2xl font-bold text-white">This month&apos;s exam is over</h2>
        <p className="mt-2 text-sm text-neutral-300">
          You didn&apos;t sit it this time. The results are on the leaderboard below
          {session?.startsAt ? <> — the next exam is on {nextExamAfter(session.startsAt)}.</> : "."}
        </p>
      </div>
    );
  } else {
    panel = (
      <div className="py-6 text-center">
        <h2 className="font-display text-2xl font-bold text-white">Next exam coming soon</h2>
        <p className="mt-2 text-sm text-neutral-300">The {EXAM_NAME} is on the last day of every month at 12:00 noon (GMT).</p>
      </div>
    );
  }

  return (
    <section className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3 text-sm">
          <Link href="/games" className="text-neutral-400 transition hover:text-white">
            ← All games
          </Link>
          <Link href={`/games/${GAME}/leaderboard`} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-neutral-200 hover:text-white">
            🏆 Leaderboard
          </Link>
        </div>
        <p className="eyebrow mb-2">
          <span className="h-px w-6 bg-accent" />
          Lenko Trivia · Real Ones Only
        </p>
        <h1 className="display-sm text-white">{EXAM_NAME}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <p className="inline-flex flex-wrap items-center gap-x-2 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm text-white">
            🏆 <b className="text-yellow-300">{ghs(prize)}</b>
            <span className="text-neutral-300">· shared by everyone who gets theirs right</span>
          </p>
          {when && status !== "over" && <p className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white">📅 {when}</p>}
        </div>

        {error && !live && status !== "open" && (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        )}
        <div className="card mt-6 p-5 sm:p-7">{panel}</div>

        {!live && <Rules session={session} when={when} prizeGhs={prize} />}
        <TriviaBoardList initial={initialBoard} refreshKey={boardKey} limit={10} className="mt-8" />
      </div>
    </section>
  );
}

/** Not confirmed yet: send a new confirmation email from here, then check again. */
function ConfirmEmail({ onCheck }: { onCheck: () => Promise<unknown> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function resend() {
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    try {
      setMsg((await resendVerification(token)).message);
    } catch (err) {
      setMsg(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="text-center">
      <h2 className="font-display text-2xl font-bold text-white">Confirm your email to play</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-300">
        We sent you a confirmation link when you signed up. Click it, then come back here. Can&apos;t find it? Check spam, or get a new one.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={resend} disabled={busy} className="btn-accent min-h-[48px]">
          {busy ? "Sending…" : "Send a new confirmation email"}
        </button>
        <button type="button" onClick={() => void onCheck()} className="btn-outline min-h-[48px]">
          I&apos;ve confirmed — check again
        </button>
      </div>
      {msg && <p className="mt-4 text-sm text-neutral-200">{msg}</p>}
    </div>
  );
}

/** The live question: countdown, the question, one answer (a lyric question: the missing words and the song). */
function QuestionPanel({
  live,
  remaining,
  busy,
  error,
  onSubmit,
}: {
  live: Live;
  remaining: number;
  busy: boolean;
  error: string | null;
  onSubmit: (answer: string, song?: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [song, setSong] = useState("");
  const [confirming, setConfirming] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => box.current?.focus(), []);
  const pct = Math.max(0, Math.min(100, (remaining / (live.seconds * 1000)) * 100));
  const low = remaining < 20000;
  const over = remaining <= 0;
  const ready = answer.trim() !== "" && (!live.askSong || song.trim() !== "");
  const field = { maxLength: 200, autoComplete: "off", autoCapitalize: "off", spellCheck: false };

  function first(e: FormEvent) {
    e.preventDefault();
    if (ready) setConfirming(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent">Your question</p>
        <p className={`font-display text-4xl font-bold tabular-nums ${low ? "text-red-400" : "text-white"}`} aria-label={`${clock(remaining)} left`}>
          {clock(remaining)}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${low ? "bg-red-400" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-6 font-display text-2xl font-bold leading-snug text-white sm:text-3xl">{live.text}</p>

      {over ? (
        <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-200">⏱ Time&apos;s up — locking it…</p>
      ) : confirming ? (
        <div className="mt-6 rounded-2xl border border-accent/40 bg-accent/10 p-4">
          <p className="text-sm text-white">
            Lock in <b>“{answer.trim()}”</b>
            {live.askSong && (
              <>
                {" "}
                from <b>“{song.trim()}”</b>
              </>
            )}
            ? You can&apos;t change it after this.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSubmit(answer.trim(), live.askSong ? song.trim() : undefined)}
              disabled={busy}
              className="btn-accent min-h-[48px] flex-1"
            >
              {busy ? "Locking…" : "Yes, lock it in"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="btn-outline min-h-[48px]">
              Edit
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={first} className={`mt-6 flex flex-col gap-3 ${live.askSong ? "" : "sm:flex-row"}`}>
          {live.askSong ? (
            <>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400" htmlFor="trivia-answer">
                The missing words <span className="normal-case tracking-normal text-neutral-500">— in order</span>
                <input
                  id="trivia-answer"
                  ref={box}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="The words in the gaps"
                  className="input mt-1.5 w-full text-base normal-case tracking-normal"
                  {...field}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400" htmlFor="trivia-song">
                The song
                <input
                  id="trivia-song"
                  value={song}
                  onChange={(e) => setSong(e.target.value)}
                  placeholder="Song title"
                  className="input mt-1.5 w-full text-base normal-case tracking-normal"
                  {...field}
                />
              </label>
            </>
          ) : (
            <>
              <label htmlFor="trivia-answer" className="sr-only">
                Your answer
              </label>
              <input id="trivia-answer" ref={box} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer" className="input flex-1 text-base" {...field} />
            </>
          )}
          <button type="submit" disabled={!ready} className="btn-accent min-h-[48px] sm:px-8">
            Submit answer
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <p className="mt-4 text-xs text-neutral-500">
        One try{live.askSong ? " — you need the words and the song right" : ""}. Your answer is private — you&apos;ll see whether you got it right now, and the right answer once the exam is over for everyone.
      </p>
    </div>
  );
}

type Review = NonNullable<NonNullable<TriviaState["mine"]>["review"]>;

function ResultPanel({ done, prizeGhs, review, reviewIn }: { done: Done; prizeGhs: number; review: Review | null; reviewIn: number | null }) {
  const r = done.result;
  return (
    <div className="py-4 text-center" role="status">
      <p className={`font-display text-5xl font-bold ${r === "correct" ? "text-emerald-300" : "text-white"}`}>
        {r === "correct" ? "✓ Correct!" : r === "wrong" ? "✗ Not this time" : "⏱ Time's up"}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm text-neutral-300">
        {r === "correct"
          ? `Real one. You passed — you're on this month's leaderboard (it shows once your time is up). Everyone on it shares the ${ghs(prizeGhs)}; DMY will be in touch.`
          : r === "wrong"
            ? "That wasn't the answer we were looking for. That was your question for this month — see you at the next exam."
            : "No answer was sent in time, so this one counts as wrong. See you at the next exam."}
      </p>
      {review ? (
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Your question</p>
          <p className="mt-1 font-semibold text-white">{review.text}</p>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-xs text-neutral-500">You said</dt>
              <dd className={r === "correct" ? "text-emerald-300" : "text-red-300"}>
                {review.yourAnswer ? `“${review.yourAnswer}”` : "No answer"}
                {review.song !== null && review.yourSong ? ` — ${review.yourSong}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">The answer</dt>
              <dd className="font-semibold text-emerald-300">
                “{review.answer}”{review.song !== null ? ` — ${review.song}` : ""}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        reviewIn !== null &&
        reviewIn > 0 && (
          <p className="mx-auto mt-4 max-w-md text-xs text-neutral-400">
            The right answer shows here once the exam is over for everyone — in about {Math.max(1, Math.ceil(reviewIn / 60000))} min.
          </p>
        )
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/games/${GAME}/leaderboard`} className="btn-outline min-h-[48px]">
          See the leaderboard
        </Link>
      </div>
    </div>
  );
}

function Rules({ session, when, prizeGhs }: { session: TriviaSession | null; when: string | null; prizeGhs: number }) {
  const minutes = session?.startsAt && session.endsAt ? sessionMinutes(session.startsAt, session.endsAt) : 10;
  const time = clock((session?.seconds ?? 120) * 1000);
  return (
    <div className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">How it works</h2>
      <ol className="mt-3 space-y-2 text-sm text-neutral-300">
        <li>
          1. The exam is on the <b className="text-white">last day of every month at 12:00 noon</b> (GMT), for {minutes} minutes
          {when ? (
            <>
              {" "}
              — next: <b className="text-white">{when}</b>.
            </>
          ) : (
            "."
          )}
        </li>
        <li>2. Sign in with a confirmed email. Part of DMY Fan Rewards 🧠🖤 — no entry fee, no purchase or donation required.</li>
        <li>
          3. Any time while it&apos;s open, tap <b className="text-white">Start my question</b>: you get one question and <b className="text-white">{time}</b>{" "}
          from your tap.
        </li>
        <li>
          4. One try — no going back, no changes. Lyric questions: fill in the missing words <i>and</i> name the song — you need both right. No answer
          in time counts as wrong.
        </li>
        <li>
          5. No options to pick from — type your answer. You see straight away whether you got it right; the right answer shows once the exam is over
          for everyone. Your answer stays private.
        </li>
        <li>
          6. Everyone who gets theirs right goes on the month&apos;s leaderboard and shares the <b className="text-yellow-300">{ghs(prizeGhs)}</b>.
        </li>
      </ol>
    </div>
  );
}
