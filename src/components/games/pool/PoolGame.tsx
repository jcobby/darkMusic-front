"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  acceptPoolChallenge,
  checkPoolQueue,
  concedePool,
  createPoolChallenge,
  getPoolLadder,
  getPoolMatch,
  getPoolMe,
  joinPoolQueue,
  leavePoolQueue,
  takePoolShot,
  type PoolFrame,
  type PoolLadder,
  type PoolMatchView,
  type PoolMe,
  type PoolShot,
} from "@/lib/api";
import { ballsLeft } from "@/lib/pool/engine";
import { site } from "@/config/site";
import { getFanToken, useFanAuth } from "../../FanAuthProvider";
import { FanName } from "../../FanName";
import { EventsStrip, useNow } from "../Events";
import { useSoundtrack } from "../Soundtrack";
import { PoolTable, type Playback } from "./PoolTable";
import { CPU_LEVELS, PoolVsComputer } from "./PoolVsComputer";
import { PoolNightBanner } from "./PoolNightBanner";
import { CuePicker } from "./CuePicker";
import { usePlayTime, useSupportPrompt } from "../SupportPrompt";
import { useGameRunning } from "../useGameRunning";
import type { CpuLevel } from "@/lib/pool/cpu";
import { describeOutcome } from "./shotText";

const POLL_MS = 1500;

/**
 * DMY Pool: the lobby (your rating, ranked matchmaking, friend challenges, the
 * ladder) and the match itself. A match link (?m=CODE) opens it — and offers to
 * accept a friend's challenge.
 */
export function PoolGame() {
  const { user, loading } = useFanAuth();
  const soundtrack = useSoundtrack();
  const music = () => soundtrack?.start(); // DMY beats while you play (needs a tap to start)
  const [screen, setScreen] = useState<"lobby" | "searching" | "match" | "computer">("lobby");
  const [level, setLevel] = useState<CpuLevel>("normal");
  const [code, setCode] = useState<string | null>(null);
  const [invite, setInvite] = useState<PoolMatchView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((c: string) => {
    setCode(c);
    setScreen("match");
    window.history.replaceState(null, "", `/games/pool?m=${c}`);
  }, []);
  const backToLobby = useCallback(() => {
    setCode(null);
    setScreen("lobby");
    window.history.replaceState(null, "", "/games/pool");
  }, []);

  // A match link: open it (or offer to accept a friend's challenge)
  useEffect(() => {
    if (loading) return;
    const c = new URLSearchParams(window.location.search).get("m");
    if (!c) return;
    getPoolMatch(c, getFanToken())
      .then((m) => {
        if (m.status === "waiting" && m.me === null) setInvite(m);
        else open(m.code);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't open that match"));
  }, [loading, user?.id, open]);

  async function accept() {
    const token = getFanToken();
    if (!token || !invite) return;
    music();
    try {
      const m = await acceptPoolChallenge(token, invite.code);
      setInvite(null);
      open(m.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't accept it");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {invite && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-accent/50 p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Challenge</p>
            <p className="mt-1 font-semibold text-white">
              {invite.players[0]?.name} challenges you — best of {invite.bestOf}
            </p>
            <p className="text-sm text-neutral-400">A friendly match: it doesn&apos;t change your ladder rating.</p>
          </div>
          {user ? (
            <button type="button" onClick={accept} className="btn-accent min-h-[48px]">
              🎱 Accept &amp; play
            </button>
          ) : (
            <Link href={`/account?next=${encodeURIComponent(`/games/pool?m=${invite.code}`)}`} className="btn-accent min-h-[48px]">
              Sign in to play
            </Link>
          )}
        </div>
      )}
      {screen === "match" && code ? (
        <MatchScreen code={code} onExit={backToLobby} onQueue={() => setScreen("searching")} />
      ) : screen === "searching" ? (
        <Searching onMatched={open} onCancel={backToLobby} />
      ) : screen === "computer" ? (
        <PoolVsComputer level={level} onExit={backToLobby} />
      ) : (
        <Lobby
          onSearch={() => {
            music();
            setScreen("searching");
          }}
          onOpen={(c) => {
            music();
            open(c);
          }}
          level={level}
          onLevel={setLevel}
          onComputer={() => {
            music();
            setScreen("computer");
          }}
        />
      )}
    </div>
  );
}

// ---------- The lobby ----------

function Lobby({
  onSearch,
  onOpen,
  level,
  onLevel,
  onComputer,
}: {
  onSearch: () => void;
  onOpen: (code: string) => void;
  level: CpuLevel;
  onLevel: (l: CpuLevel) => void;
  onComputer: () => void;
}) {
  const { user, loading } = useFanAuth();
  const [me, setMe] = useState<PoolMe | null>(null);
  const [ladder, setLadder] = useState<PoolLadder | null>(null);
  const [ladderError, setLadderError] = useState<string | null>(null);
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const token = getFanToken();
    setLadderError(null);
    getPoolLadder(token)
      .then(setLadder)
      .catch((err) => setLadderError(err instanceof Error ? err.message : "Couldn't load the ladder"));
    if (token && user) getPoolMe(token).then(setMe).catch(() => {});
  }, [user]);
  useEffect(() => {
    load();
  }, [load]);

  async function challenge() {
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      onOpen((await createPoolChallenge(token, bestOf)).code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create it");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PoolNightBanner onPlay={onSearch} signedIn={Boolean(user)} />

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-accent-deep/60 to-transparent p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">1v1 · 8-ball</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">Ranked ladder</h2>
          <p className="mt-1 text-sm text-neutral-300">
            Best of 3 against a fan near your level. Win and you climb the ladder; lose and you drop. Ranked wins count for Pool events and their prizes.
          </p>
          {!user ? (
            !loading && (
              <Link href="/account?next=%2Fgames%2Fpool" className="btn-accent mt-4 min-h-[48px]">
                Sign in to play
              </Link>
            )
          ) : (
            <>
              {me && (
                <p className="mt-3 text-sm text-white">
                  Rating <b className="font-display text-lg text-accent">{me.rating}</b> · {me.wins}W {me.losses}L
                  {me.rank ? ` · #${me.rank} on the ladder` : " · play a ranked match to go on the ladder"}
                </p>
              )}
              {me?.active ? (
                <button type="button" onClick={() => onOpen(me.active!.code)} className="btn-accent mt-4 min-h-[48px]">
                  ▶ Back to your {me.active.status === "waiting" ? "challenge" : "match"}
                </button>
              ) : (
                <button type="button" onClick={onSearch} className="btn-accent mt-4 min-h-[52px] text-base">
                  🎱 Play ranked — best of 3
                </button>
              )}
            </>
          )}
        </div>
        {user && !me?.active && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] p-5">
            <div>
              <p className="font-semibold text-white">Challenge a friend</p>
              <p className="text-sm text-neutral-400">Send them a link. Friendly — no rating change.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-white/10 p-0.5" role="radiogroup" aria-label="Best of">
                {([1, 3, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={bestOf === n}
                    onClick={() => setBestOf(n)}
                    className={`min-h-[40px] rounded-full px-3 text-xs font-semibold ${bestOf === n ? "bg-accent text-white" : "text-neutral-300"}`}
                  >
                    Best of {n}
                  </button>
                ))}
              </div>
              <button type="button" disabled={busy} onClick={challenge} className="btn-outline min-h-[44px] text-sm">
                Get a link
              </button>
            </div>
            {error && <p className="w-full text-sm text-red-300">{error}</p>}
          </div>
        )}
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold text-white">🤖 Play the computer</p>
          <p className="text-sm text-neutral-400">Nobody around? Practise on your own, any time — no sign-in, and it doesn&apos;t touch your rating.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-white/10 p-0.5" role="radiogroup" aria-label="Computer level">
            {CPU_LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={level === l.id}
                onClick={() => onLevel(l.id)}
                className={`min-h-[40px] rounded-full px-3 text-xs font-semibold ${level === l.id ? "bg-accent text-white" : "text-neutral-300"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onComputer} className="btn-outline min-h-[44px] text-sm">
            Play
          </button>
        </div>
      </div>

      <CuePicker />

      <EventsStrip game="pool" />

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 text-xs text-neutral-400">
          <span>Ladder{ladder ? ` · ${ladder.total.toLocaleString()} players` : ""}</span>
          <span>W–L · Rating</span>
        </div>
        {!ladder ? (
          ladderError ? (
            <div className="p-6 text-center text-sm text-neutral-400">
              <p>Couldn&apos;t load the ladder — {ladderError}.</p>
              <button type="button" onClick={load} className="btn-outline mt-3 min-h-[44px] text-sm">
                Try again
              </button>
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>
          )
        ) : ladder.top.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-400">Nobody on the ladder yet — win the first ranked match.</p>
        ) : (
          <ol className="divide-y divide-white/[0.04]">
            {ladder.top.map((r) => (
              <li key={r.rank} className={`flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5 ${r.mine ? "bg-accent/15 ring-1 ring-inset ring-accent/50" : ""}`}>
                <span
                  className={`grid h-7 min-w-[1.75rem] shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                    r.rank === 1 ? "bg-accent text-white" : r.rank <= 3 ? "bg-white/15 text-white" : "bg-white/5 text-neutral-300"
                  }`}
                >
                  {r.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-white">
                  <FanName name={r.mine ? <b>You</b> : r.name} flair={r.flair} />
                </span>
                <span className="text-xs tabular-nums text-neutral-400">
                  {r.wins}–{r.losses}
                </span>
                <span className="w-12 text-right font-semibold tabular-nums text-white">{r.rating}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card p-5">
        <p className="mb-2 text-sm font-semibold text-white">How it plays</p>
        <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-400">
          <li>• 8-ball: the table stays open after the break; the first ball you pot makes you solids or stripes. Pot all yours, then the 8.</li>
          <li>• Pot one of yours and you shoot again. Potting one of theirs isn&apos;t a foul, but your turn ends.</li>
          <li>
            • Fouls — they get ball in hand anywhere: hitting their ball (or the 8, before you&apos;re on it) first, missing everything, sinking the cue
            ball, or a hit where nothing goes in and no ball reaches a cushion afterwards. Touching one of yours and one of theirs at the same instant is
            fine.
          </li>
          <li>
            • The break: the cue ball goes behind the line. Miss every ball and they break instead. Sink the cue ball and they get it in hand behind the
            line — and can&apos;t hit a ball that&apos;s behind the line until the cue ball has crossed it. The 8 on the break goes back on its spot,
            and the breaker carries on.
          </li>
          <li>• Sink the 8 before your balls are cleared, or foul on the shot that sinks it, and you lose the frame.</li>
          <li>• {"40 seconds a shot (the clock waits for the last shot to stop rolling) — run out of time and they get ball in hand; three in a row and you lose the match."}</li>
          <li>• Ranked: best of 3, matched by rating. The same two players count at most 3 times a day. Friend challenges and the computer don&apos;t change ratings.</li>
          <li>• 🎱 DMY Pool Night: every Thursday, 7pm–10pm GMT. Ranked matches started that night go on the night&apos;s board — most wins tops it.</li>
        </ul>
      </div>
    </>
  );
}

// ---------- Matchmaking ----------

function Searching({ onMatched, onCancel }: { onMatched: (code: string) => void; onCancel: () => void }) {
  const [state, setState] = useState<{ waiting: number; since: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();

  useEffect(() => {
    const token = getFanToken();
    if (!token) return onCancel();
    let live = true;
    const handle = (q: Awaited<ReturnType<typeof checkPoolQueue>>) => {
      if (!live) return;
      if (q.status === "matched") onMatched(q.code);
      else if (q.status === "searching") setState({ waiting: q.waiting, since: Date.parse(q.since) });
    };
    joinPoolQueue(token)
      .then(handle)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't join the queue"));
    const id = setInterval(() => {
      checkPoolQueue(token)
        .then((q) => (q.status === "idle" ? joinPoolQueue(token).then(handle) : handle(q))) // dropped (a restart): back in
        .catch(() => {});
    }, 2000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [onMatched, onCancel]);

  async function cancel() {
    const token = getFanToken();
    if (token) await leavePoolQueue(token).catch(() => {});
    onCancel();
  }

  const secs = state && now ? Math.max(0, Math.floor((now - state.since) / 1000)) : 0;
  return (
    <div className="card p-8 text-center">
      <p className="text-4xl" aria-hidden>
        🎱
      </p>
      <p className="mt-3 font-display text-2xl font-bold text-white">Finding an opponent…</p>
      <p className="mt-1 text-sm text-neutral-400" aria-live="polite">
        {error ?? (state ? `${secs}s · ${state.waiting} looking right now` : "Joining the queue…")}
      </p>
      <p className="mt-2 text-xs text-neutral-500">The longer you wait, the wider the rating range. Keep this page open.</p>
      <button type="button" onClick={cancel} className="btn-outline mt-5 min-h-[44px]">
        Cancel
      </button>
    </div>
  );
}

// ---------- A match ----------

const clock = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`);

/** What the last shot did, in words. */
function describe(v: PoolMatchView, shot: NonNullable<PoolMatchView["lastShot"]>): string {
  const name = (i: 0 | 1) => (v.me === i ? "You" : v.players[i]?.name ?? "They");
  const other: 0 | 1 = shot.by === 0 ? 1 : 0;
  if (shot.timeout) return `${name(shot.by)} ran out of time — ${name(other)} ${v.me === other ? "have" : "has"} ball in hand`;
  return shot.outcome ? describeOutcome(shot.outcome, shot.by, name, v.me, v.frames) : "";
}

/** The two players' record against each other, all time: "You 3 – 2 Kwame B." */
function HeadToHead({ v }: { v: PoolMatchView }) {
  const h = v.headToHead!;
  const name = (i: 0 | 1) => (v.me === i ? "You" : v.players[i]?.name ?? "—");
  const since = h.since ? new Date(h.since).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm">
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">⚔️ Head to head</span>
      {h.matches === 0 ? (
        <span className="text-neutral-200">First meeting — this one starts the record</span>
      ) : (
        <>
          <span className="font-semibold text-white">
            {name(0)} <span className="font-display text-lg tabular-nums">{h.wins[0]}</span>
            <span className="mx-1 text-neutral-500">–</span>
            <span className="font-display text-lg tabular-nums">{h.wins[1]}</span> {name(1)}
          </span>
          <span className="text-xs text-neutral-400">
            {h.matches} match{h.matches === 1 ? "" : "es"} · frames {h.frames[0]}–{h.frames[1]}
            {since && ` · since ${since}`}
          </span>
        </>
      )}
    </div>
  );
}

function MatchScreen({ code, onExit, onQueue }: { code: string; onExit: () => void; onQueue: () => void }) {
  const [v, setV] = useState<PoolMatchView | null>(null);
  const [table, setTable] = useState<PoolFrame | null>(null); // the table as shown (it waits for animations)
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const shown = useRef(-1); // the shot number on the table
  const pendingView = useRef<PoolMatchView | null>(null); // the state after the animation
  const offset = useRef(0); // server clock − ours
  const now = useNow(250);
  // On a phone the table and its Shoot button sit below the fold: bring them into view once play starts
  const top = useRef<HTMLDivElement | null>(null);
  const scrolled = useRef(false);
  const playing = v?.status === "playing";
  useEffect(() => {
    if (!playing || scrolled.current) return;
    scrolled.current = true;
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [playing]);

  /** A new look at the match: animate the shot that just happened, or catch up. */
  const take = useCallback((m: PoolMatchView) => {
    if (m.shotNo < shown.current) return; // an older look that arrived late
    offset.current = Date.parse(m.now) - Date.now();
    setV(m);
    if (m.shotNo === shown.current) return;
    const s = m.lastShot;
    if (shown.current >= 0 && s && s.no === m.shotNo && s.no === shown.current + 1 && s.start && s.shot) {
      pendingView.current = m;
      shown.current = m.shotNo;
      setPlayback({ key: m.shotNo, start: s.start, shot: s.shot });
    } else {
      shown.current = m.shotNo;
      setTable(m.frame);
      setMessage(s ? describe(m, s) : null);
    }
  }, []);

  const onPlayed = useCallback(() => {
    const m = pendingView.current;
    pendingView.current = null;
    setPlayback(null);
    if (m) {
      setTable(m.frame);
      if (m.lastShot) setMessage(describe(m, m.lastShot));
    }
  }, []);

  // Check the table every 1.5 s
  useEffect(() => {
    let live = true;
    const load = () =>
      getPoolMatch(code, getFanToken())
        .then((m) => live && take(m))
        .catch((err) => live && setError(err instanceof Error ? err.message : "Can't reach the table"));
    void load();
    const id = setInterval(() => {
      if (!document.hidden && !pendingView.current) void load();
    }, POLL_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [code, take]);

  const shoot = useCallback(
    async (shot: PoolShot, cue?: { x: number; y: number }) => {
      const token = getFanToken();
      if (!token || !v) return;
      setSending(true);
      setError(null);
      try {
        take(await takePoolShot(token, code, { shotNo: v.shotNo, dx: shot.dx, dy: shot.dy, power: shot.power, cue }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "That shot didn't go through");
        getPoolMatch(code, token).then(take).catch(() => {});
      } finally {
        setSending(false);
      }
    },
    [code, v, take]
  );

  async function concede() {
    const token = getFanToken();
    if (!token || !v) return;
    if (!confirm(v.status === "waiting" ? "Call off this challenge?" : "Give up this match? Your opponent wins.")) return;
    try {
      take(await concedePool(token, code));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't do that");
    }
  }

  const { user: me } = useFanAuth(); // their cue design
  // Play time for the support ask, which only ever comes once a match is over
  const { prompt, atBreak } = useSupportPrompt();
  usePlayTime(v?.status === "playing" && v.me !== null);
  useGameRunning(v?.status === "playing" && v.me !== null);
  const wasPlaying = useRef(false);
  useEffect(() => {
    if (v?.status === "playing") wasPlaying.current = true;
    else if (v?.status === "finished" && wasPlaying.current) {
      wasPlaying.current = false;
      atBreak();
    }
  }, [v?.status, atBreak]);

  if (!v) return <div className="card p-10 text-center text-neutral-500">{error ?? "Opening the table…"}</div>;

  const frame = table ?? v.frame;
  const myTurn = v.status === "playing" && v.me !== null && frame?.turn === v.me && !playback && !pendingView.current && !sending && v.frame?.turn === v.me;
  const left = v.turnEndsAt && now ? Math.max(0, Math.ceil((Date.parse(v.turnEndsAt) - (now + offset.current)) / 1000)) : null;
  const link = `${site.url}/games/pool?m=${v.code}`;
  const myGroup = v.me !== null && frame ? frame.groups[v.me] : null;
  const target = v.me !== null && frame && myGroup ? (ballsLeft(frame, v.me) === 0 ? "eight" : myGroup) : null;

  // A challenge waiting for the friend
  if (v.status === "waiting") {
    const share = `Play me at pool on Dark Music Yard — best of ${v.bestOf}: ${link}`;
    return (
      <div className="card space-y-4 p-6 text-center">
        <p className="font-display text-2xl font-bold text-white">Waiting for your friend…</p>
        <p className="text-sm text-neutral-400">Send them this link. The match starts when they open it and accept (best of {v.bestOf}).</p>
        <div className="mx-auto flex max-w-md gap-2">
          <input readOnly value={link} className="input flex-1 text-xs" />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(link).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1800))).catch(() => {})}
            className="btn-outline shrink-0"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[44px]">
            Send on WhatsApp
          </a>
          <a href={`https://twitter.com/intent/tweet?${new URLSearchParams({ text: share })}`} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[44px]">
            Post on X
          </a>
        </div>
        <button type="button" onClick={concede} className="text-xs font-semibold text-neutral-500 hover:text-red-300">
          Call it off
        </button>
      </div>
    );
  }
  if (v.status === "cancelled") {
    return (
      <div className="card p-8 text-center">
        <p className="font-semibold text-white">This challenge was called off (or expired).</p>
        <button type="button" onClick={onExit} className="btn-accent mt-4 min-h-[44px]">
          Back to the lobby
        </button>
      </div>
    );
  }

  const player = (i: 0 | 1) => {
    const p = v.players[i];
    const group = frame?.groups[i];
    const ballsToGo = frame && group ? ballsLeft(frame, i) : null;
    const turn = v.status === "playing" && frame?.turn === i;
    return (
      <div className={`min-w-0 flex-1 rounded-2xl border p-3 ${turn ? "border-accent bg-accent/10" : "border-white/10 bg-white/[0.02]"}`}>
        <p className="truncate text-sm font-semibold text-white">
          <FanName name={v.me === i ? "You" : (p?.name ?? "—")} flair={p?.flair ?? null} />
        </p>
        <p className="text-xs text-neutral-400">
          {p?.rating}
          {group ? ` · ${group === "solids" ? "● solids" : "◐ stripes"}${ballsToGo === 0 ? " · on the 8" : ballsToGo !== null ? ` · ${ballsToGo} left` : ""}` : ""}
        </p>
        <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">{v.frames[i]}</p>
        {turn && left !== null && (
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" aria-label={`${left} seconds left`}>
            <div className={`h-full rounded-full ${left <= 10 ? "bg-yellow-400" : "bg-accent"}`} style={{ width: `${Math.min(100, (left / v.turnSeconds) * 100)}%` }} />
          </div>
        )}
      </div>
    );
  };

  const won = v.status === "finished" && v.me !== null && v.winner === v.me;
  return (
    <div ref={top} className="scroll-mt-20 space-y-3">
      {prompt}
      <div className="flex items-stretch gap-2">
        {player(0)}
        <div className="grid place-items-center px-1 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          <span>
            {v.ranked ? "Ranked" : "Friendly"}
            <br />
            best of {v.bestOf}
            <br />
            frame {v.frameNo}
          </span>
        </div>
        {player(1)}
      </div>

      {v.headToHead && v.players.length === 2 && <HeadToHead v={v} />}

      <p className="min-h-[1.5rem] text-center text-sm text-neutral-200" aria-live="polite">
        {v.status === "playing" && !playback
          ? myTurn
            ? `Your shot${left !== null ? ` · ${clock(left)}` : ""}${message ? ` — ${message}` : ""}`
            : v.me === null
              ? message
              : `${v.players[frame?.turn ?? 0]?.name}'s shot${left !== null ? ` · ${clock(left)}` : ""}${message ? ` — ${message}` : ""}`
          : message}
      </p>
      {error && <p className="text-center text-sm text-red-300">{error}</p>}

      {frame && (
        <PoolTable
          balls={frame.balls}
          playback={playback}
          onPlayed={onPlayed}
          canShoot={Boolean(myTurn)}
          ballInHand={frame.ballInHand}
          breakShot={frame.breakShot}
          kitchen={frame.kitchen === true}
          target={target}
          onShoot={shoot}
          cueDesign={me?.cueDesign}
        />
      )}

      {v.status === "finished" ? (
        <div className="card p-6 text-center">
          <p className="font-display text-3xl font-bold text-white">{v.me === null ? `${v.players[v.winner ?? 0]?.name} wins` : won ? "🏆 You win!" : "You lose"}</p>
          <p className="mt-1 text-sm text-neutral-300">
            {v.reason}
            {v.ratingChange && v.me !== null && (
              <>
                {" "}
                · rating{" "}
                <b className={v.ratingChange[v.me] >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {v.ratingChange[v.me] >= 0 ? "+" : ""}
                  {v.ratingChange[v.me]}
                </b>
              </>
            )}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onQueue} className="btn-accent min-h-[48px]">
              🎱 Play ranked again
            </button>
            <button type="button" onClick={onExit} className="btn-outline min-h-[48px]">
              Lobby
            </button>
          </div>
        </div>
      ) : (
        v.me !== null && (
          <div className="flex justify-between">
            <button type="button" onClick={onExit} className="text-xs font-semibold text-neutral-500 hover:text-white">
              ← Lobby (the match carries on)
            </button>
            <button type="button" onClick={concede} className="text-xs font-semibold text-neutral-500 hover:text-red-300">
              Give up
            </button>
          </div>
        )
      )}
    </div>
  );
}
