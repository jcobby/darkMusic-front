"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveGameScore, startGameRun, type GameRunStart } from "@/lib/api";
import { getFanToken } from "../FanAuthProvider";

/**
 * What the player sees about their leaderboard score while they play, so they
 * know straight away whether it's counting — and can fix it (sign in, reconnect)
 * before putting in the effort.
 */
export type SaveState =
  | { s: "off" } // no game yet
  | { s: "guest" } // not signed in: this game won't count
  | { s: "connecting"; slow: boolean } // starting the run on the server
  | {
      s: "live"; // counting; `saved` is this game's score as the board has it
      saved: number;
      best: number | null; // the month's best (this game or an earlier one)
      rank: number | null;
      total: number | null;
      newBest: boolean; // this game set a new monthly best
      saving: boolean;
    }
  | { s: "offline"; saved: number; tries: number } // can't reach the server: retrying
  | { s: "busy"; saved: number } // too many saves: retrying shortly
  | { s: "signin" } // sign-in expired: this game can't count
  | { s: "rejected"; message: string }; // this game can't be saved

interface Run {
  id: number;
  start: Promise<GameRunStart | null> | null;
  starting: boolean;
  token: string | null;
  ranked: boolean;
  lastStartTry: number;
  saved: number; // highest score the server has confirmed for this game
  best: number | null;
  rank: number | null;
  total: number | null;
  newBest: boolean;
  sending: boolean;
  again: boolean; // another save was asked for while one was on its way
  lastTry: number;
  failures: number;
  ended: { score: number; level: number } | null;
}

const blankRun = (id: number): Run => ({
  id,
  start: null,
  starting: false,
  token: null,
  ranked: false,
  lastStartTry: 0,
  saved: 0,
  best: null,
  rank: null,
  total: null,
  newBest: false,
  sending: false,
  again: false,
  lastTry: Date.now(),
  failures: 0,
  ended: null,
});

const liveState = (r: Run, saving: boolean): SaveState => ({
  s: "live",
  saved: r.saved,
  best: r.best,
  rank: r.rank,
  total: r.total,
  newBest: r.newBest,
  saving,
});

// Games that couldn't be saved yet (no connection, page closed mid-game): sent again
// later from this browser. A run token is only good for 12 hours.
const PENDING_KEY = "dmy_unsaved_scores";
const PENDING_MAX_AGE = 12 * 3600 * 1000;
interface Pending {
  game: string;
  t: string; // run token
  s: number;
  l: number;
  at: number;
}
function readPending(): Pending[] {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]") as Pending[];
    return Array.isArray(all) ? all.filter((p) => p && p.t && Date.now() - p.at < PENDING_MAX_AGE) : [];
  } catch {
    return [];
  }
}
function writePending(list: Pending[]) {
  try {
    if (list.length) localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-5)));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage blocked — nothing to keep */
  }
}
function keepPending(p: Omit<Pending, "at">) {
  writePending([...readPending().filter((x) => x.t !== p.t), { ...p, at: Date.now() }]);
}
function dropPending(token: string, upTo = Infinity) {
  const list = readPending();
  const next = list.filter((x) => !(x.t === token && x.s <= upTo));
  if (next.length !== list.length) writePending(next);
}

const FIRST_SAVE_MS = 8000; // first save soon after scoring starts, so "Saved" shows early
const SAVE_EVERY_MS = 15000;

/**
 * Saves a game's score to the leaderboard as it's played: at every level, every few
 * seconds of scoring, when the page is hidden or left, and at game over — retrying
 * what fails, and keeping unsaved games in this browser to send later.
 */
export function useScoreSaver(game: string, progress: () => { score: number; level: number }, playing: boolean) {
  const [save, setSave] = useState<SaveState>({ s: "off" });
  const [recovered, setRecovered] = useState<number | null>(null);
  const seq = useRef(0);
  const run = useRef<Run>(blankRun(0));
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  /** Send the game's score now (or as soon as the save on its way is back). */
  const send = useCallback(
    async (r: Run, opts: { keepalive?: boolean } = {}): Promise<void> => {
      if (!r.ranked || !r.token) return;
      if (r.sending) {
        r.again = true;
        return;
      }
      const isCurrent = r.id === seq.current;
      const { score, level } = r.ended ?? progressRef.current();
      if (score <= 0 || (score <= r.saved && (!r.ended || r.rank !== null))) {
        if (isCurrent && r.saved > 0) setSave(liveState(r, false));
        return;
      }
      const fan = getFanToken();
      if (!fan) {
        if (isCurrent) setSave({ s: "signin" });
        return;
      }
      r.sending = true;
      r.lastTry = Date.now();
      if (isCurrent) setSave((prev) => (prev.s === "live" ? { ...prev, saving: true } : prev));
      const res = await saveGameScore(fan, game, { runToken: r.token, score, level }, { keepalive: opts.keepalive });
      r.sending = false;
      const stillCurrent = r.id === seq.current;
      if (res.ok) {
        r.saved = Math.max(r.saved, res.saved);
        r.best = res.best;
        r.rank = res.rank;
        r.total = res.total;
        r.newBest = r.newBest || res.newBest;
        r.failures = 0;
        dropPending(r.token, r.saved);
        if (stillCurrent) setSave(liveState(r, false));
      } else {
        r.failures += 1;
        // A finished game that didn't save is kept, to send again later.
        if (r.ended && res.reason !== "rejected") keepPending({ game, t: r.token, s: score, l: level });
        if (stillCurrent) {
          if (res.reason === "offline" || (res.reason === "early" && r.ended)) {
            setSave({ s: "offline", saved: r.saved, tries: r.failures });
          } else if (res.reason === "busy") setSave({ s: "busy", saved: r.saved });
          else if (res.reason === "signin") setSave({ s: "signin" });
          else if (res.reason === "rejected") setSave({ s: "rejected", message: res.message });
          else setSave(liveState(r, false)); // "early": a later save will get through
        }
      }
      if (r.again) {
        r.again = false;
        void send(r);
      }
    },
    [game]
  );

  const requestStart = useCallback(
    (r: Run) => {
      const fan = getFanToken();
      r.starting = true;
      r.lastStartTry = Date.now();
      r.start = startGameRun(fan, game).then((res) => {
        r.starting = false;
        const isCurrent = r.id === seq.current;
        if (!res) {
          r.failures += 1;
          if (isCurrent) setSave(fan ? { s: "offline", saved: 0, tries: r.failures } : { s: "guest" });
          return res;
        }
        r.token = res.runToken;
        r.ranked = res.ranked;
        r.failures = 0;
        if (isCurrent) {
          if (res.signInExpired) setSave({ s: "signin" });
          else setSave(res.ranked ? liveState(r, false) : { s: "guest" });
        }
        // The game may already have scored (or ended) while this was on its way.
        if (r.ranked) void send(r);
        return res;
      });
      return r.start;
    },
    [game, send]
  );

  /** A new game: starts its run on the server. */
  const begin = useCallback(() => {
    const prev = run.current;
    // The last game's final score is still on its way: keep it to send again later.
    if (prev.ended && prev.token && prev.ranked && prev.saved < prev.ended.score) {
      keepPending({ game, t: prev.token, s: prev.ended.score, l: prev.ended.level });
    }
    const r = (run.current = blankRun(++seq.current));
    setSave(getFanToken() ? { s: "connecting", slow: false } : { s: "guest" });
    void requestStart(r);
  }, [game, requestStart]);

  /** Save now (a level was cleared). */
  const checkpoint = useCallback(() => void send(run.current), [send]);

  /** Game over: save the final score (sent when the run has started, if it hasn't yet). */
  const finish = useCallback(
    (score: number, level: number) => {
      const r = run.current;
      r.ended = { score, level };
      void send(r);
    },
    [send]
  );

  /** Try again straight away (the player tapped "Try again"). */
  const retry = useCallback(() => {
    const r = run.current;
    if (!r.token) {
      if (!r.starting) void requestStart(r);
      return;
    }
    r.failures = 0;
    void send(r);
  }, [requestStart, send]);

  /** The run token (for the unreleased-track unlock), once the server has given one. */
  const runToken = useCallback(async () => {
    const r = run.current;
    if (r.token) return r.token;
    return (await r.start)?.runToken ?? r.token;
  }, []);

  // While playing: save every few seconds of scoring, retry what failed, and keep
  // trying to start a run that couldn't reach the server.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const r = run.current;
      const now = Date.now();
      if (!r.token) {
        if (r.starting && now - r.lastStartTry > 12000) {
          setSave((p) => (p.s === "connecting" && !p.slow ? { s: "connecting", slow: true } : p));
        }
        if (!r.starting && getFanToken() && now - r.lastStartTry > 8000) void requestStart(r);
        return;
      }
      if (!r.ranked || r.sending) return;
      const wait = r.failures ? Math.min(30000, 5000 * r.failures) : r.saved ? SAVE_EVERY_MS : FIRST_SAVE_MS;
      if (now - r.lastTry >= wait && progressRef.current().score > r.saved) void send(r);
    }, 2000);
    return () => clearInterval(id);
  }, [playing, requestStart, send]);

  // Leaving mid-game (switching apps, closing the tab, going to another page): save
  // what's been scored, and keep it in case the page closes before it gets through.
  useEffect(() => {
    const stash = () => {
      if (!playingRef.current) return;
      const r = run.current;
      if (!r.ranked || !r.token) return;
      const { score, level } = progressRef.current();
      if (score <= r.saved) return;
      keepPending({ game, t: r.token, s: score, l: level });
      void send(r, { keepalive: true });
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") stash();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      stash(); // leaving the game page
    };
  }, [game, send]);

  // Not playing: send games that couldn't be saved before (on opening the page,
  // when the connection comes back, and every 15 s).
  useEffect(() => {
    if (playing) return;
    let busy = false;
    const flush = async () => {
      const fan = getFanToken();
      const list = readPending().filter((p) => p.game === game);
      if (busy || !fan || !list.length) return;
      busy = true;
      for (const p of list) {
        const r = run.current;
        if (r.token === p.t && r.saved >= p.s) {
          dropPending(p.t); // already saved
          continue;
        }
        const res = await saveGameScore(fan, game, { runToken: p.t, score: p.s, level: p.l });
        if (res.ok || res.reason === "rejected") dropPending(p.t);
        if (res.ok && r.token === p.t) {
          // The game just played: show it as saved.
          r.saved = Math.max(r.saved, res.saved);
          r.best = res.best;
          r.rank = res.rank;
          r.total = res.total;
          r.newBest = r.newBest || res.newBest;
          r.failures = 0;
          if (r.id === seq.current) setSave(liveState(r, false));
        } else if (res.ok) {
          setRecovered(p.s);
        }
        if (!res.ok && res.reason !== "rejected") break; // still can't get through — later
      }
      busy = false;
    };
    void flush();
    const id = setInterval(flush, 15000);
    window.addEventListener("online", flush);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", flush);
    };
  }, [playing, game]);

  return { save, begin, checkpoint, finish, retry, runToken, recovered };
}
