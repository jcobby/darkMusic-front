"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GameShell, GameOver } from "./GameShell";
import { useAudioPlayer } from "../AudioPlayerProvider";
import { shuffle, type FreeBeat } from "@/lib/games";
import { useBestScore } from "@/lib/useBestScore";

const LANES = 4;
const KEYS = ["d", "f", "j", "k"];
const W = 360;
const H = 560;
const HIT_Y = H - 84;
const APPROACH = 1.5; // seconds a note takes to fall to the hit line
const SONG_SECONDS = 60; // one round = the first minute of the beat
const PERFECT = 0.07;
const GOOD = 0.14;
const LEAD_IN = 1.4; // seconds of falling notes before the music starts

interface Note {
  t: number; // seconds into the song
  lane: number;
  judged?: "perfect" | "good" | "miss";
}
interface Chart {
  notes: Note[];
  duration: number;
  buffer: AudioBuffer;
  bass: Float32Array; // 0–1 bass envelope, for the pulsing stage light
  hop: number; // seconds per envelope frame
}
interface PlayState {
  startAt: number; // AudioContext time the song starts
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  nextOpen: number; // every note before this index is judged
  pressed: number[]; // song time each lane was last tapped
  judge: { text: string; lane: number; at: number } | null;
}

const freshState = (startAt: number): PlayState => ({
  startAt,
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfect: 0,
  good: 0,
  miss: 0,
  nextOpen: 0,
  pressed: [-9, -9, -9, -9],
  judge: null,
});

/**
 * Turn the first minute of a beat into a note chart: split it into lows
 * (kick/808) and highs (snare/hats), find the hits in each, then put kicks on
 * the left lanes and snares/hats on the right.
 */
async function buildChart(ctx: AudioContext, beat: FreeBeat): Promise<Chart> {
  // ~2.6 MB is roughly a minute of a 320 kbps MP3 — enough for a round, faster to fetch.
  // Skip the HTTP cache both ways: a cached partial copy (from the soundtrack or an
  // earlier round) can break this request, and ours mustn't break theirs.
  // If a partial download is refused, fall back to the whole file.
  let res: Response;
  try {
    res = await fetch(beat.src, { headers: { Range: "bytes=0-2600000" }, cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    res = await fetch(beat.src, { cache: "no-store" });
  }
  if (!res.ok) throw new Error("Couldn't load that beat");
  const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
  const sr = buffer.sampleRate;
  const duration = Math.min(buffer.duration, SONG_SECONDS);
  const n = Math.floor(duration * sr);

  const mono = new Float32Array(n);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += ch[i] / buffer.numberOfChannels;
  }

  // Energy per 512-sample frame in two bands, via one-pole filters.
  const hopSamples = 512;
  const hop = hopSamples / sr;
  const frames = Math.floor(n / hopSamples);
  const low = new Float32Array(frames);
  const high = new Float32Array(frames);
  const aLow = Math.exp((-2 * Math.PI * 150) / sr);
  const aMid = Math.exp((-2 * Math.PI * 2500) / sr);
  let lp = 0;
  let mp = 0;
  for (let f = 0; f < frames; f++) {
    let el = 0;
    let eh = 0;
    for (let k = 0; k < hopSamples; k++) {
      const x = mono[f * hopSamples + k];
      lp = (1 - aLow) * x + aLow * lp;
      mp = (1 - aMid) * x + aMid * mp;
      const h = x - mp;
      el += lp * lp;
      eh += h * h;
    }
    low[f] = Math.sqrt(el / hopSamples);
    high[f] = Math.sqrt(eh / hopSamples);
  }

  // Onsets = peaks in the rise of energy that stand out from the local average.
  const onsets = (env: Float32Array, minGap: number, minStrength: number) => {
    const flux = new Float32Array(frames);
    let max = 0;
    for (let f = 1; f < frames; f++) {
      flux[f] = Math.max(0, env[f] - env[f - 1]);
      max = Math.max(max, flux[f]);
    }
    const win = Math.round(0.4 / hop);
    const out: { t: number; s: number }[] = [];
    let last = -1e9;
    for (let f = 1; f < frames - 1; f++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, f - win); j <= Math.min(frames - 1, f + win); j++) {
        sum += flux[j];
        count++;
      }
      const strength = max ? flux[f] / max : 0;
      if (
        flux[f] > (sum / count) * 1.8 + max * 0.06 &&
        flux[f] >= flux[f - 1] &&
        flux[f] >= flux[f + 1] &&
        strength >= minStrength &&
        (f - last) * hop >= minGap
      ) {
        out.push({ t: f * hop, s: strength });
        last = f;
      }
    }
    return out;
  };

  const hits = [
    ...onsets(low, 0.24, 0.1).map((o) => ({ ...o, side: 0 })),
    ...onsets(high, 0.2, 0.25).map((o) => ({ ...o, side: 1 })),
  ].sort((a, b) => a.t - b.t);

  const notes: Note[] = [];
  const alt = [0, 0];
  let lastT = -1;
  for (const h of hits) {
    if (h.t < 0.6 || h.t - lastT < 0.2) continue; // keep it playable: max ~5 notes a second
    notes.push({ t: h.t, lane: h.side * 2 + (alt[h.side]++ % 2) });
    lastT = h.t;
  }
  // A very soft beat can defeat the detector — fall back to a steady groove.
  if (notes.length < duration * 0.6) {
    notes.length = 0;
    for (let t = 1, i = 0; t < duration - 0.5; t += 0.5, i++) notes.push({ t, lane: [0, 2, 1, 3][i % 4] });
  }

  let lmax = 0;
  for (const v of low) lmax = Math.max(lmax, v);
  const bass = low.map((v) => (lmax ? v / lmax : 0));
  return { notes, duration, buffer, bass, hop };
}

function drawDisc(c: CanvasRenderingContext2D, x: number, y: number, kick: boolean) {
  c.beginPath();
  c.arc(x, y, 19, 0, Math.PI * 2);
  c.fillStyle = kick ? "#111114" : "#f4f4f5";
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = "#ef2b2d";
  c.stroke();
  c.beginPath();
  c.arc(x, y, 7, 0, Math.PI * 2);
  c.fillStyle = "#ef2b2d";
  c.fill();
  c.beginPath();
  c.arc(x, y, 1.8, 0, Math.PI * 2);
  c.fillStyle = kick ? "#f4f4f5" : "#111114";
  c.fill();
}

function draw(c: CanvasRenderingContext2D, chart: Chart | null, st: PlayState | null, s: number) {
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#120509");
  bg.addColorStop(1, "#050507");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  const frame = chart ? Math.floor(s / chart.hop) : -1;
  const pulse = chart && frame >= 0 && frame < chart.bass.length ? chart.bass[frame] : 0;
  const glow = c.createRadialGradient(W / 2, HIT_Y, 10, W / 2, HIT_Y, H * 0.75);
  glow.addColorStop(0, `rgba(239,43,45,${0.1 + pulse * 0.4})`);
  glow.addColorStop(1, "rgba(239,43,45,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  const laneW = W / LANES;
  for (let l = 0; l < LANES; l++) {
    if (st && s - st.pressed[l] < 0.12) {
      c.fillStyle = "rgba(239,43,45,0.16)";
      c.fillRect(l * laneW, 0, laneW, H);
    }
    if (l > 0) {
      c.fillStyle = "rgba(255,255,255,0.06)";
      c.fillRect(l * laneW, 0, 1, H);
    }
  }

  c.fillStyle = "rgba(255,255,255,0.3)";
  c.fillRect(0, HIT_Y - 1, W, 2);
  for (let l = 0; l < LANES; l++) {
    const x = laneW * (l + 0.5);
    c.beginPath();
    c.arc(x, HIT_Y, 24, 0, Math.PI * 2);
    c.lineWidth = 2;
    c.strokeStyle = st && s - st.pressed[l] < 0.12 ? "#ff5a5f" : "rgba(239,43,45,0.6)";
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.font = "bold 13px system-ui, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(KEYS[l].toUpperCase(), x, HIT_Y + 44);
  }

  if (chart && st) {
    for (let i = st.nextOpen; i < chart.notes.length; i++) {
      const n = chart.notes[i];
      const until = n.t - s;
      if (until > APPROACH) break;
      if (n.judged) continue;
      const y = HIT_Y - (until / APPROACH) * (HIT_Y + 30);
      drawDisc(c, laneW * (n.lane + 0.5), y, n.lane < 2);
    }

    if (st.judge && s - st.judge.at < 0.5) {
      const a = 1 - (s - st.judge.at) / 0.5;
      c.globalAlpha = a;
      c.fillStyle = st.judge.text === "Miss" ? "#a3a3a3" : st.judge.text === "Perfect" ? "#ff5a5f" : "#ffffff";
      c.font = "bold 18px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText(st.judge.text, laneW * (st.judge.lane + 0.5), HIT_Y - 48 - (1 - a) * 12);
      c.globalAlpha = 1;
    }
    if (st.combo >= 5) {
      c.fillStyle = "rgba(255,255,255,0.18)";
      c.font = "bold 64px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText(`${st.combo}`, W / 2, H * 0.36);
      c.font = "bold 13px system-ui, sans-serif";
      c.fillText("COMBO", W / 2, H * 0.36 + 42);
    }
    c.fillStyle = "rgba(255,255,255,0.12)";
    c.fillRect(0, 0, W, 3);
    c.fillStyle = "#ef2b2d";
    c.fillRect(0, 0, W * Math.max(0, Math.min(1, s / chart.duration)), 3);
  }
}

type Phase = "select" | "loading" | "playing" | "over";

/** Rhythm game: notes are generated from the drums of a DMY free beat. */
export function BeatTap({ beats }: { beats: FreeBeat[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const st = useRef<PlayState | null>(null);
  const raf = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [choice, setChoice] = useState<string>("random");
  const [beat, setBeat] = useState<FreeBeat | null>(null);
  const [hud, setHud] = useState({ score: 0, combo: 0 });
  const [result, setResult] = useState<PlayState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBest, setIsBest] = useState(false);
  const { best, submit } = useBestScore("beat-tap");
  const site = useAudioPlayer();

  // Song position comes from the audio clock, so notes stay locked to what you hear.
  const songTime = useCallback(
    () => (ctxRef.current && st.current ? ctxRef.current.currentTime - st.current.startAt : 0),
    []
  );

  const render = useCallback(() => {
    const c = canvasRef.current?.getContext("2d");
    if (c) draw(c, chartRef.current, st.current, songTime());
  }, [songTime]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = W * dpr;
    c.height = H * dpr;
    c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }, [render]);

  const stopAudio = useCallback(() => {
    try {
      sourceRef.current?.stop();
    } catch {
      /* already stopped */
    }
    sourceRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    stopAudio();
    const s = st.current;
    if (s) {
      setResult({ ...s });
      setIsBest(submit(s.score));
    }
    setPhase("over");
  }, [submit, stopAudio]);

  const tick = useCallback(() => {
    const chart = chartRef.current;
    const s = st.current;
    if (!chart || !s) return;
    const now = songTime();
    let changed = false;
    // Notes that slid past the hit window are misses.
    for (let i = s.nextOpen; i < chart.notes.length; i++) {
      const n = chart.notes[i];
      if (n.t - now > -GOOD) break;
      if (!n.judged) {
        n.judged = "miss";
        s.miss++;
        s.combo = 0;
        s.judge = { text: "Miss", lane: n.lane, at: now };
        changed = true;
      }
    }
    while (s.nextOpen < chart.notes.length && chart.notes[s.nextOpen].judged) s.nextOpen++;
    render();
    if (changed) setHud({ score: s.score, combo: s.combo });
    if (now >= chart.duration + 0.4) {
      finish();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }, [render, finish, songTime]);

  const hit = useCallback(
    (lane: number) => {
      const chart = chartRef.current;
      const s = st.current;
      if (phase !== "playing" || !chart || !s) return;
      const now = songTime();
      s.pressed[lane] = now;
      for (let i = s.nextOpen; i < chart.notes.length; i++) {
        const n = chart.notes[i];
        if (n.t - now > GOOD) break;
        if (n.judged || n.lane !== lane || Math.abs(n.t - now) > GOOD) continue;
        const perfect = Math.abs(n.t - now) <= PERFECT;
        n.judged = perfect ? "perfect" : "good";
        s.combo++;
        s.maxCombo = Math.max(s.maxCombo, s.combo);
        if (perfect) s.perfect++;
        else s.good++;
        s.score += (perfect ? 300 : 100) * (1 + Math.min(3, Math.floor(s.combo / 10)));
        s.judge = { text: perfect ? "Perfect" : "Good", lane, at: now };
        setHud({ score: s.score, combo: s.combo });
        return;
      }
    },
    [phase, songTime]
  );

  async function start(pick: FreeBeat) {
    setError(null);
    setBeat(pick);
    setPhase("loading");
    stopAudio();
    // Quiet the site soundtrack / Spotify bar first.
    if (site.playing) site.toggle();
    window.dispatchEvent(new Event("dmy:stop-spotify"));
    try {
      if (!ctxRef.current) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      await ctx.resume();
      const chart = chartRef.current?.buffer && beat?.id === pick.id ? chartRef.current : await buildChart(ctx, pick);
      chart.notes.forEach((n) => delete n.judged);
      chartRef.current = chart;
      const startAt = ctx.currentTime + LEAD_IN;
      st.current = freshState(startAt);
      const src = ctx.createBufferSource();
      src.buffer = chart.buffer;
      src.connect(ctx.destination);
      src.start(startAt, 0, chart.duration);
      sourceRef.current = src;
      setHud({ score: 0, combo: 0 });
      setIsBest(false);
      setPhase("playing");
      raf.current = requestAnimationFrame(tick);
    } catch {
      setError("That beat didn't load — try another one.");
      setPhase("select");
    }
  }

  const pickBeat = () => (choice === "random" ? shuffle(beats)[0] : beats.find((b) => b.id === choice) ?? beats[0]);

  // Keyboard: D F J K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const lane = KEYS.indexOf(e.key.toLowerCase());
      if (lane >= 0 && phase === "playing") {
        e.preventDefault();
        hit(lane);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hit, phase]);

  // Hide the tab → the song (and the clock) pauses with it.
  useEffect(() => {
    const onVis = () => {
      const ctx = ctxRef.current;
      if (!ctx || phase !== "playing") return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      stopAudio();
      void ctxRef.current?.close();
    },
    [stopAudio]
  );

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    hit(Math.min(LANES - 1, Math.floor(((e.clientX - rect.left) / rect.width) * LANES)));
  }

  const total = result ? result.perfect + result.good + result.miss : 0;
  const accuracy = result && total ? Math.round(((result.perfect + result.good * 0.5) / total) * 100) : 0;

  return (
    <GameShell slug="beat-tap" best={best}>
      <div className="card mx-auto max-w-md overflow-hidden p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2 px-1 text-sm">
          <span className="font-semibold text-white">
            Score <span className="font-display text-lg text-accent">{hud.score.toLocaleString()}</span>
          </span>
          {beat && phase !== "select" ? (
            <span className="min-w-0 truncate text-xs text-neutral-400">
              ♪ <span className="text-white">{beat.title}</span>
            </span>
          ) : null}
          <span className="font-semibold text-white">
            Combo <span className="font-display text-lg text-accent">{hud.combo}</span>
          </span>
        </div>
        <div className="relative">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            className="block aspect-[9/14] w-full touch-none select-none rounded-2xl"
            aria-label="Beat Tap lanes — tap a lane or press D, F, J, K"
          />

          {phase === "select" && (
            <div className="absolute inset-0 overflow-y-auto rounded-2xl bg-ink/90 p-5 backdrop-blur-sm">
              <p className="font-display text-2xl font-bold text-white">Pick a beat</p>
              <p className="mt-1 text-xs text-neutral-400">
                The game listens to the drums and turns them into notes. Kicks fall on the left, snares and
                hats on the right. One round is the first minute of the beat.
              </p>
              {beats.length === 0 ? (
                <p className="mt-6 text-sm text-neutral-400">Free beats are on the way — check back soon.</p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[{ id: "random", title: "🎲 Surprise me", genre: null as string | null }, ...beats].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setChoice(b.id)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                          choice === b.id
                            ? "border-accent bg-accent/20 text-white"
                            : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/25"
                        }`}
                      >
                        <span className="block truncate font-semibold">{b.title}</span>
                        {b.genre && <span className="text-[11px] text-neutral-500">{b.genre}</span>}
                      </button>
                    ))}
                  </div>
                  {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                  <button type="button" onClick={() => start(pickBeat())} className="btn-accent mt-4 w-full">
                    Start
                  </button>
                  <p className="mt-2 text-center text-[11px] text-neutral-500">
                    Keys D · F · J · K — or tap the lanes. Turn your sound on.
                  </p>
                </>
              )}
            </div>
          )}

          {phase === "loading" && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-ink/85 p-6 text-center backdrop-blur-sm">
              <div>
                <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <p className="mt-4 font-semibold text-white">Loading “{beat?.title}”…</p>
                <p className="mt-1 text-xs text-neutral-400">Listening to the drums and building your notes</p>
              </div>
            </div>
          )}

          {phase === "over" && result && (
            <div className="absolute inset-0 grid place-items-center overflow-y-auto rounded-2xl bg-ink/90 p-6 backdrop-blur-sm">
              <GameOver
                title="Round complete"
                score={`${result.score.toLocaleString()} pts`}
                isBest={isBest}
                onRestart={() => beat && start(beat)}
              >
                <dl className="mx-auto mt-4 grid max-w-xs grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white/5 p-2">
                    <dt className="text-neutral-500">Accuracy</dt>
                    <dd className="text-lg font-bold text-white">{accuracy}%</dd>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2">
                    <dt className="text-neutral-500">Best combo</dt>
                    <dd className="text-lg font-bold text-white">{result.maxCombo}</dd>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2">
                    <dt className="text-neutral-500">Perfect</dt>
                    <dd className="text-lg font-bold text-accent">{result.perfect}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-neutral-400">
                  {result.good} good · {result.miss} missed ·{" "}
                  <button type="button" onClick={() => setPhase("select")} className="text-accent hover:underline">
                    pick another beat
                  </button>
                </p>
                <Link href="/free-beats" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
                  Love “{beat?.title}”? Download it free →
                </Link>
              </GameOver>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
