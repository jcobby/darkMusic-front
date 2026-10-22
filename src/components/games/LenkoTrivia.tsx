"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  getTriviaLobby,
  getTriviaState,
  pingTrivia,
  resendVerification,
  triviaReady,
  triviaLeave,
  submitTriviaAnswer,
  type TriviaBoard,
  type TriviaLobby,
  type TriviaResult,
  type TriviaState,
} from "@/lib/api";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { signInHref } from "./ScoreSaveStatus";
import { TriviaBoardList } from "./TriviaBoard";

const GAME = "lenko-trivia";
const PING_MS = 2000; // a ready player's page checks in this often
const LOBBY_MS = 5000; // everyone else sees the count refresh this often

const ghs = (n: number) => `GH₵${n.toLocaleString()}`;
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong — try again");

interface Live {
  attemptId: string;
  roundNumber: number;
  text: string;
  endsAt: number; // this browser's clock
  seconds: number;
}
interface Done {
  result: TriviaResult;
  roundNumber: number;
}

/**
 * Lenko Trivia: members wait in the lobby, and when enough are ready at the same
 * time a round starts — each gets one question and a countdown. One try; only
 * their own result is shown; correct answers make the prize leaderboard.
 */
export function LenkoTrivia({ initialBoard }: { initialBoard: TriviaBoard }) {
  const { user, loading } = useFanAuth();
  const [lobby, setLobby] = useState<TriviaLobby | null>(null);
  const [state, setState] = useState<TriviaState | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const audio = useRef<AudioContext | null>(null);
  const roundEnds = useRef(0); // when the current round is over (right answers then show on the board)
  const phase = state?.phase ?? "idle";

  const apply = useCallback((s: TriviaState) => {
    setState(s);
    setLobby(s);
    const q = s.phase === "question" ? s.question : null;
    if (q) roundEnds.current = Date.now() + q.remainingMs;
    setLive((prev) =>
      !q
        ? null
        : prev?.attemptId === q.attemptId
          ? prev
          : { attemptId: q.attemptId, roundNumber: q.roundNumber, text: q.text, endsAt: Date.now() + q.remainingMs, seconds: q.seconds }
    );
  }, []);

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

  useEffect(() => {
    if (!loading && user) void refresh();
  }, [loading, user, refresh]);

  // Couldn't load (e.g. the server was still waking up): keep trying.
  useEffect(() => {
    if (!user || state || !error) return;
    const id = setInterval(() => void refresh(), 5000);
    return () => clearInterval(id);
  }, [user, state, error, refresh]);

  /** The round started: buzz, beep and flag the tab, in case they looked away. */
  const alertStart = useCallback(() => {
    try {
      navigator.vibrate?.([250, 120, 250]);
    } catch {
      /* not supported */
    }
    const ctx = audio.current;
    if (ctx) {
      for (const t of [0, 0.28]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.12;
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.16);
      }
    }
  }, []);

  // Ready: check in every 2 s — that keeps you in the lobby and brings your question the moment the round starts.
  useEffect(() => {
    if (phase !== "ready" || live) return;
    let busyPing = false;
    const id = setInterval(async () => {
      const token = getFanToken();
      if (!token || busyPing) return;
      busyPing = true;
      try {
        const p = await pingTrivia(token);
        setLobby((l) => (l ? { ...l, ...p } : null));
        if (p.phase === "question") {
          alertStart();
          const q = p.question;
          if (q) {
            // The question came with the check-in — show it now, no extra request.
            roundEnds.current = Date.now() + q.remainingMs;
            setLive({ attemptId: q.attemptId, roundNumber: q.roundNumber, text: q.text, endsAt: Date.now() + q.remainingMs, seconds: q.seconds });
            setState((s) => (s ? { ...s, phase: "question", question: q } : s));
          } else {
            await refresh();
          }
        } else if (p.phase === "idle") {
          setNotice("You're no longer in the lobby (the page was away too long). Tap “I'm Online & Ready” to join again.");
          await refresh();
        }
      } catch {
        /* a missed check-in; the next one tries again */
      } finally {
        busyPing = false;
      }
    }, PING_MS);
    return () => clearInterval(id);
  }, [phase, live, refresh, alertStart]);

  // Not in the lobby: keep the "ready now" count fresh.
  useEffect(() => {
    if (phase === "ready" || live) return;
    const tick = () => getTriviaLobby().then(setLobby).catch(() => {});
    tick();
    const id = setInterval(tick, LOBBY_MS);
    return () => clearInterval(id);
  }, [phase, live]);

  // The countdown
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [live]);
  const remaining = live ? live.endsAt - now : 0;
  const timeUp = live !== null && remaining <= 0;

  // Time's up with nothing sent: that's "no answer" — show it straight away. The page
  // catches up with the server a few seconds later, at a random moment, so a whole
  // round of pages doesn't ask at the same instant.
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
    if (live) document.title = `⏱ ${clock(remaining)} · Lenko Trivia`;
  }, [live, remaining]);

  // When the round is over, refresh the board (right answers appear then).
  useEffect(() => {
    if (!done) return;
    const wait = Math.max(0, roundEnds.current - Date.now()) + 12000;
    const id = setTimeout(() => setBoardKey((k) => k + 1), wait);
    return () => clearTimeout(id);
  }, [done]);

  async function ready() {
    const token = getFanToken();
    if (!token) return;
    setNotice(null);
    setError(null);
    setDone(null);
    setBusy(true);
    // This tap lets the page play the "your round started" beep later.
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    } catch {
      /* no audio */
    }
    try {
      const s = await triviaReady(token);
      apply(s);
      if (s.phase === "question") alertStart();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    try {
      apply(await triviaLeave(token));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit(answer: string) {
    const token = getFanToken();
    if (!token || !live) return;
    setBusy(true);
    setError(null);
    try {
      const r = await submitTriviaAnswer(token, live.attemptId, answer);
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

  const l = lobby;
  let panel: React.ReactNode;
  if (loading || (user && !state && !error)) {
    panel = <p className="py-10 text-center text-sm text-neutral-400">Loading…</p>;
  } else if (!user) {
    panel = (
      <div className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent">Members only · free</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-white">Sign in to play</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-300">Lenko Trivia is for Dark Music Yard members. It&apos;s free — create an account in a minute.</p>
        {l && <Meter lobby={l} className="mx-auto mt-6 max-w-sm text-left" />}
        <Link href={signInHref(GAME)} className="btn-accent mt-6 min-h-[52px] w-full max-w-xs">
          Sign in or create an account
        </Link>
      </div>
    );
  } else if (live) {
    panel = <QuestionPanel live={live} remaining={remaining} busy={busy} error={error} onSubmit={submit} />;
  } else if (done) {
    panel = <ResultPanel done={done} prizeGhs={l?.prizeGhs ?? 1000} canPlayAgain={(state?.questionsLeft ?? 1) > 0} onAgain={() => setDone(null)} />;
  } else if (state && !state.emailConfirmed) {
    panel = <ConfirmEmail onCheck={refresh} />;
  } else if (l && !l.open) {
    panel = (
      <div className="py-6 text-center">
        <h2 className="font-display text-2xl font-bold text-white">Lenko Trivia is paused</h2>
        <p className="mt-2 text-sm text-neutral-300">Check back soon — the next session will be announced on our socials.</p>
      </div>
    );
  } else if (phase === "ready") {
    panel = (
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          You&apos;re ready — waiting for players
        </p>
        {l && <Meter lobby={l} className="mt-4" />}
        <p className="mt-5 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
          <b>Keep this page open.</b> When {l?.needed ?? 10} players are ready, your question appears here straight away and your{" "}
          {clock((l?.seconds ?? 120) * 1000)} starts.
        </p>
        <button type="button" onClick={leave} disabled={busy} className="mt-4 text-sm text-neutral-400 underline hover:text-white">
          Leave the lobby
        </button>
      </div>
    );
  } else {
    const noneLeft = state?.questionsLeft === 0;
    panel = (
      <div>
        {l && <Meter lobby={l} />}
        {notice && <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-200">{notice}</p>}
        {state?.noQuestionsYet ? (
          <p className="mt-6 text-center text-sm text-neutral-300">Lenko Trivia hasn&apos;t started yet — questions are coming soon.</p>
        ) : noneLeft ? (
          <p className="mt-6 text-center text-sm text-neutral-300">You&apos;ve had every question we have — new ones are coming soon.</p>
        ) : (
          <button type="button" onClick={ready} disabled={busy} className="btn-accent mt-6 min-h-[56px] w-full text-base">
            {busy ? "Joining…" : "✋ I'm Online & Ready"}
          </button>
        )}
        {state?.last && (
          <p className="mt-4 text-center text-xs text-neutral-400">
            Your last round (round {state.last.roundNumber}):{" "}
            <b className={state.last.result === "correct" ? "text-emerald-300" : "text-neutral-200"}>
              {state.last.result === "correct" ? "✓ Correct" : state.last.result === "wrong" ? "✗ Wrong" : "⏱ No answer in time"}
            </b>
          </p>
        )}
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
          DMY Games · Members only
        </p>
        <h1 className="display-sm text-white">Lenko Trivia</h1>
        <p className="mt-3 inline-flex flex-wrap items-center gap-x-2 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm text-white">
          🏆 Prize pool <b className="text-yellow-300">{ghs(l?.prizeGhs ?? initialBoard.prizeGhs)}</b>
          <span className="text-neutral-300">· right answers make the board</span>
        </p>

        {error && !live && <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <div className="card mt-6 p-5 sm:p-7">{panel}</div>

        {!live && <Rules lobby={l} />}
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

/** "7 / 10 ready" with a bar, and who's waiting. */
function Meter({ lobby, className = "" }: { lobby: TriviaLobby; className?: string }) {
  const pct = Math.min(100, (lobby.ready / Math.max(1, lobby.needed)) * 100);
  return (
    <div className={className} aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-4xl font-bold text-white tabular-nums">
          {lobby.ready}
          <span className="text-2xl text-neutral-500"> / {lobby.needed}</span>
        </p>
        <p className="text-sm text-neutral-400">ready right now</p>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {lobby.names.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lobby.names.map((n, i) => (
            <span key={i} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-neutral-300">
              {n}
            </span>
          ))}
          {lobby.ready > lobby.names.length && <span className="px-1 py-1 text-xs text-neutral-500">+{lobby.ready - lobby.names.length} more</span>}
        </div>
      )}
    </div>
  );
}

/** The live question: countdown, the question, one answer. */
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
  onSubmit: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [confirming, setConfirming] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => box.current?.focus(), []);
  const pct = Math.max(0, Math.min(100, (remaining / (live.seconds * 1000)) * 100));
  const low = remaining < 20000;
  const over = remaining <= 0;

  function first(e: FormEvent) {
    e.preventDefault();
    if (answer.trim()) setConfirming(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent">Round {live.roundNumber} · your question</p>
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
            Lock in <b>“{answer.trim()}”</b>? You can&apos;t change it after this.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => onSubmit(answer.trim())} disabled={busy} className="btn-accent min-h-[48px] flex-1">
              {busy ? "Locking…" : "Yes, lock it in"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="btn-outline min-h-[48px]">
              Edit
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={first} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="trivia-answer" className="sr-only">
            Your answer
          </label>
          <input
            id="trivia-answer"
            ref={box}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={200}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Type your answer"
            className="input flex-1 text-base"
          />
          <button type="submit" disabled={!answer.trim()} className="btn-accent min-h-[48px] sm:px-8">
            Submit answer
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <p className="mt-4 text-xs text-neutral-500">One try. Your answer is private — you&apos;ll only see whether you got it right.</p>
    </div>
  );
}

function ResultPanel({ done, prizeGhs, canPlayAgain, onAgain }: { done: Done; prizeGhs: number; canPlayAgain: boolean; onAgain: () => void }) {
  const r = done.result;
  return (
    <div className="py-4 text-center" role="status">
      <p className={`font-display text-5xl font-bold ${r === "correct" ? "text-emerald-300" : "text-white"}`}>
        {r === "correct" ? "✓ Correct!" : r === "wrong" ? "✗ Not this time" : "⏱ Time's up"}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm text-neutral-300">
        {r === "correct"
          ? `You're on the Lenko Trivia leaderboard (it shows round ${done.roundNumber} once the round is over). DMY will be in touch about the ${ghs(prizeGhs)} prize.`
          : r === "wrong"
            ? "That wasn't the answer we were looking for."
            : "No answer was sent in time, so this one counts as wrong."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {canPlayAgain && (
          <button type="button" onClick={onAgain} className="btn-accent min-h-[48px]">
            Play another round
          </button>
        )}
        <Link href={`/games/${GAME}/leaderboard`} className="btn-outline min-h-[48px]">
          See the leaderboard
        </Link>
      </div>
    </div>
  );
}

function Rules({ lobby }: { lobby: TriviaLobby | null }) {
  const needed = lobby?.needed ?? 10;
  const time = clock((lobby?.seconds ?? 120) * 1000);
  return (
    <div className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">How it works</h2>
      <ol className="mt-3 space-y-2 text-sm text-neutral-300">
        <li>1. Tap <b className="text-white">I&apos;m Online &amp; Ready</b> and keep this page open.</li>
        <li>
          2. When <b className="text-white">{needed} players</b> are ready at the same time, the round starts for everyone who&apos;s ready.
        </li>
        <li>
          3. You get one question (players can get different ones) and <b className="text-white">{time}</b> to answer.
        </li>
        <li>4. One try — no going back, no changes. No answer in time counts as wrong.</li>
        <li>5. Your answer stays private. You only see your own result: correct or wrong.</li>
        <li>
          6. Everyone who gets theirs right goes on the leaderboard for the <b className="text-yellow-300">{ghs(lobby?.prizeGhs ?? 1000)}</b> prize pool. No
          points — just right or wrong.
        </li>
      </ol>
    </div>
  );
}
