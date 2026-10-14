"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GameShell, GameOver } from "./GameShell";
import { useSoundtrack, bassLevel, newFreqBuffer, type FreqBuffer } from "./Soundtrack";
import { useBestScore } from "@/lib/useBestScore";
import { startGameRun, submitGameScore } from "@/lib/api";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { PrizeLeaderboard } from "./PrizeLeaderboard";

const GAME = "beat-breaker";

type Entry =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "done"; newBest: boolean; best: number; rank: number | null }
  | { state: "error"; message: string };

// Logical playfield; the canvas is scaled to fit its container.
const W = 360;
const H = 480;
const COLS = 8;
const GAP = 4;
const SIDE = 10;
const TOP = 48;
const BRICK_W = (W - SIDE * 2 - GAP * (COLS - 1)) / COLS;
const BRICK_H = 15;
const PADDLE_Y = H - 34;
const PADDLE_H = 10;
const PADDLE_W = 70;
const WIDE_W = 108;
const BALL_R = 6;
const LIVES = 3;
const ON_BEAT = 0.16; // seconds after a kick that still count as "on the beat"

type BrickKind = "red" | "tough" | "gold";
interface Brick {
  x: number;
  y: number;
  kind: BrickKind;
  hp: number;
  row: number;
}
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
type PowerKind = "wide" | "multi" | "life";
interface Power {
  x: number;
  y: number;
  kind: PowerKind;
}
interface Pop {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}
interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}
interface World {
  level: number;
  bricks: Brick[];
  balls: Ball[];
  powers: Power[];
  pops: Pop[];
  shards: Shard[];
  paddleX: number;
  wideFor: number; // seconds of wide paddle left
  stuck: boolean; // ball resting on the paddle, waiting for launch
  score: number;
  lives: number;
  streak: number; // on-beat hits in a row
  elapsed: number;
  flash: number;
  left: boolean;
  right: boolean;
  last: number;
  // Beat-sync, same detector as Vinyl Catch
  bassAvg: number;
  beatAt: number;
  heardAt: number;
  pulse: number;
  pulseRow: number;
}

const POWER_LABEL: Record<PowerKind, string> = { wide: "WIDE", multi: "×3", life: "+♥" };

/** Rows of bricks for a level: more rows, tougher bricks and gaps as it goes on. */
function buildLevel(level: number): Brick[] {
  const rows = Math.min(4 + level, 9);
  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      // From level 3, knock out a symmetric pattern of holes.
      if (level >= 3 && (r + c * (level % 4 + 1)) % 7 === 0 && c !== 0 && c !== COLS - 1) continue;
      const roll = Math.random();
      const toughChance = Math.min(0.45, 0.06 + level * 0.07) * (r < rows / 2 ? 1.4 : 0.6);
      const kind: BrickKind = roll < 0.07 ? "gold" : roll < 0.07 + toughChance ? "tough" : "red";
      bricks.push({
        x: SIDE + c * (BRICK_W + GAP),
        y: TOP + r * (BRICK_H + GAP),
        kind,
        hp: kind === "tough" ? 2 : 1,
        row: r,
      });
    }
  }
  return bricks;
}

const ballSpeed = (level: number) => Math.min(250 + level * 22, 420);

function fresh(level = 1, carry?: Pick<World, "score" | "lives">): World {
  return {
    level,
    bricks: buildLevel(level),
    balls: [{ x: W / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0 }],
    powers: [],
    pops: [],
    shards: [],
    paddleX: W / 2,
    wideFor: 0,
    stuck: true,
    score: carry?.score ?? 0,
    lives: carry?.lives ?? LIVES,
    streak: 0,
    elapsed: 0,
    flash: 0,
    left: false,
    right: false,
    last: 0,
    bassAvg: 0,
    beatAt: -10,
    heardAt: -10,
    pulse: 0,
    pulseRow: 0,
  };
}

const paddleW = (g: World) => (g.wideFor > 0 ? WIDE_W : PADDLE_W);

function launch(g: World) {
  if (!g.stuck) return;
  g.stuck = false;
  const s = ballSpeed(g.level);
  const a = (Math.random() - 0.5) * 0.6; // slight random angle
  g.balls[0].vx = s * Math.sin(a);
  g.balls[0].vy = -s * Math.cos(a);
}

function brickColor(b: Brick, lit: boolean): string {
  if (b.kind === "gold") return lit ? "#ffd75e" : "#e8b923";
  if (b.kind === "tough") return b.hp === 2 ? (lit ? "#a8001b" : "#7a0011") : lit ? "#ff3b55" : "#d6001c";
  // Rows fade from electric red at the top to a deeper red lower down.
  const shades = ["#ff1f3d", "#ff3350", "#f0102f", "#e3002a", "#d6001c", "#c8001e", "#b8001b", "#a8001b", "#98001a"];
  return lit ? "#ff6b7d" : shades[Math.min(b.row, shades.length - 1)];
}

function draw(ctx: CanvasRenderingContext2D, g: World) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#14070a");
  bg.addColorStop(1, "#050507");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, TOP + 40, 10, W / 2, TOP + 40, H * (0.6 + g.pulse * 0.3));
  glow.addColorStop(0, `rgba(255,31,61,${0.12 + g.pulse * 0.28})`);
  glow.addColorStop(1, "rgba(255,31,61,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // On-beat streak (score, level and lives are in the HUD above the canvas)
  ctx.textBaseline = "middle";
  if (g.streak >= 2) {
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff5c70";
    ctx.fillText(`ON-BEAT STREAK ×${g.streak}`, W / 2, 24);
  }

  // Bricks — the row the kick lands on lights up
  for (const b of g.bricks) {
    const lit = g.pulse > 0.1 && b.row === g.pulseRow;
    const grow = lit ? g.pulse * 1.5 : 0;
    ctx.fillStyle = brickColor(b, lit);
    ctx.beginPath();
    ctx.roundRect(b.x - grow, b.y - grow, BRICK_W + grow * 2, BRICK_H + grow * 2, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(b.x + 2, b.y + 2, BRICK_W - 4, 2);
    if (b.kind === "tough" && b.hp === 2) {
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 1.5, b.y + 1.5, BRICK_W - 3, BRICK_H - 3);
    }
  }

  // Shards from broken bricks
  for (const s of g.shards) {
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  // Falling power-ups
  for (const p of g.powers) {
    ctx.fillStyle = p.kind === "life" ? "#ffffff" : "#ff1f3d";
    ctx.beginPath();
    ctx.roundRect(p.x - 17, p.y - 8, 34, 16, 8);
    ctx.fill();
    ctx.fillStyle = p.kind === "life" ? "#ff1f3d" : "#ffffff";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(POWER_LABEL[p.kind], p.x, p.y + 1);
  }

  // Paddle
  const pw = paddleW(g);
  const px = g.paddleX - pw / 2;
  ctx.shadowColor = "rgba(255,31,61,0.7)";
  ctx.shadowBlur = 12 + g.pulse * 14;
  ctx.fillStyle = "#c8001e";
  ctx.beginPath();
  ctx.roundRect(px, PADDLE_Y, pw, PADDLE_H, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff1f3d";
  ctx.fillRect(px + 5, PADDLE_Y, pw - 10, 3);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 8px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DMY", g.paddleX, PADDLE_Y + PADDLE_H / 2 + 1);

  // Balls
  for (const b of g.balls) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255,92,112,0.9)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  if (g.stuck) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Tap or press Space to launch", W / 2, PADDLE_Y - 40);
  }

  for (const p of g.pops) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;

  if (g.flash > 0) {
    ctx.fillStyle = `rgba(255,31,61,${g.flash * 1.4})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Break the bricks with the ball. The bricks pulse with the free beat playing —
 *  break one on the kick for double points. */
export function BeatBreaker() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const world = useRef<World>(fresh());
  const raf = useRef<number | null>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [hud, setHud] = useState({ score: 0, lives: LIVES, level: 1 });
  const [isBest, setIsBest] = useState(false);
  const { best, submit } = useBestScore("beat-breaker");
  const soundtrack = useSoundtrack();
  const freq = useRef<FreqBuffer>(newFreqBuffer());
  const { user } = useFanAuth();
  // Signed-in players' runs count for the monthly prize: a server token marks when each run began.
  const runToken = useRef<Promise<string | null> | null>(null);
  const [entry, setEntry] = useState<Entry>({ state: "idle" });
  const [boardKey, setBoardKey] = useState(0);

  const submitRun = useCallback(async (score: number, level: number) => {
    const token = getFanToken();
    const pending = runToken.current;
    runToken.current = null;
    if (!token || !pending || score <= 0) return;
    setEntry({ state: "sending" });
    try {
      const run = await pending;
      if (!run) throw new Error("Couldn't reach the leaderboard");
      const r = await submitGameScore(token, GAME, { runToken: run, score, level });
      setEntry({ state: "done", newBest: r.newBest, best: r.best, rank: r.rank });
      setBoardKey((k) => k + 1);
    } catch (err) {
      setEntry({ state: "error", message: err instanceof Error ? err.message : "Score not submitted" });
    }
  }, []);

  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, world.current);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = W * dpr;
    c.height = H * dpr;
    c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }, [render]);

  const tick = useCallback(
    (t: number) => {
      let g = world.current;
      const dt = g.last ? Math.min(0.033, (t - g.last) / 1000) : 0;
      g.last = t;
      g.elapsed += dt;
      let changed = false;

      // Paddle
      if (g.left) g.paddleX -= 380 * dt;
      if (g.right) g.paddleX += 380 * dt;
      const pw = paddleW(g);
      g.paddleX = Math.max(pw / 2, Math.min(W - pw / 2, g.paddleX));
      g.wideFor = Math.max(0, g.wideFor - dt);

      // Listen to the soundtrack — every kick lights a row of bricks.
      const level = bassLevel(soundtrack?.analyser.current ?? null, freq.current);
      if (level > 8) g.heardAt = g.elapsed;
      if (level > g.bassAvg * 1.25 + 6 && level > 90 && g.elapsed - g.beatAt > 0.25) {
        g.beatAt = g.elapsed;
        g.pulse = 1;
        const rows = Math.max(1, ...g.bricks.map((b) => b.row + 1));
        g.pulseRow = Math.floor(Math.random() * rows);
      }
      g.bassAvg = g.bassAvg * 0.9 + level * 0.1;
      g.pulse = Math.max(0, g.pulse - dt * 3);
      const musicOn = g.elapsed - g.heardAt < 1;

      if (g.stuck) {
        g.balls[0].x = g.paddleX;
        g.balls[0].y = PADDLE_Y - BALL_R - 1;
      }

      // Move each ball in small steps so it can't tunnel through a brick.
      const speedUp = 1 + Math.min(g.elapsed / 90, 0.35);
      for (const ball of g.balls) {
        if (g.stuck) break;
        const dist = Math.hypot(ball.vx, ball.vy) * speedUp * dt;
        const steps = Math.max(1, Math.ceil(dist / 3));
        for (let s = 0; s < steps; s++) {
          ball.x += (ball.vx * speedUp * dt) / steps;
          ball.y += (ball.vy * speedUp * dt) / steps;

          // Walls
          if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
          if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
          if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

          // Paddle: the further from the centre it hits, the sharper the angle.
          const cw = paddleW(g);
          if (
            ball.vy > 0 &&
            ball.y + BALL_R >= PADDLE_Y &&
            ball.y - BALL_R <= PADDLE_Y + PADDLE_H &&
            Math.abs(ball.x - g.paddleX) <= cw / 2 + BALL_R
          ) {
            const hit = Math.max(-1, Math.min(1, (ball.x - g.paddleX) / (cw / 2)));
            const angle = hit * 1.05; // up to ~60°
            const speed = Math.max(ballSpeed(g.level), Math.hypot(ball.vx, ball.vy));
            ball.vx = speed * Math.sin(angle);
            ball.vy = -speed * Math.cos(angle);
            ball.y = PADDLE_Y - BALL_R - 0.5;
          }

          // Bricks
          for (let i = 0; i < g.bricks.length; i++) {
            const b = g.bricks[i];
            const nx = Math.max(b.x, Math.min(ball.x, b.x + BRICK_W));
            const ny = Math.max(b.y, Math.min(ball.y, b.y + BRICK_H));
            const dx = ball.x - nx;
            const dy = ball.y - ny;
            if (dx * dx + dy * dy > BALL_R * BALL_R) continue;

            // Bounce off the side we came in through.
            const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + BRICK_W - (ball.x - BALL_R));
            const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + BRICK_H - (ball.y - BALL_R));
            if (overlapX < overlapY) ball.vx = ball.x < b.x + BRICK_W / 2 ? -Math.abs(ball.vx) : Math.abs(ball.vx);
            else ball.vy = ball.y < b.y + BRICK_H / 2 ? -Math.abs(ball.vy) : Math.abs(ball.vy);

            b.hp -= 1;
            changed = true;
            const cx = b.x + BRICK_W / 2;
            const cy = b.y + BRICK_H / 2;
            if (b.hp > 0) {
              g.pops.push({ x: cx, y: cy, text: "crack", life: 0.6, color: "#a3a3a3" });
              break;
            }

            const onBeat = musicOn && g.elapsed - g.beatAt <= ON_BEAT;
            g.streak = onBeat ? g.streak + 1 : 0;
            const base = b.kind === "gold" ? 50 : b.kind === "tough" ? 20 : 10;
            const pts = base * (onBeat ? 2 : 1);
            g.score += pts;
            g.pops.push({
              x: cx,
              y: cy,
              text: onBeat ? `ON BEAT +${pts}` : `+${pts}`,
              life: 1,
              color: onBeat ? "#ff5c70" : b.kind === "gold" ? "#f5c542" : "#ffffff",
            });
            const color = brickColor(b, false);
            for (let k = 0; k < 8; k++) {
              g.shards.push({
                x: cx,
                y: cy,
                vx: (Math.random() - 0.5) * 220,
                vy: (Math.random() - 0.8) * 200,
                life: 0.8,
                color,
              });
            }
            // Gold bricks always drop a power-up; others sometimes do.
            if (b.kind === "gold" || Math.random() < 0.08) {
              const roll = Math.random();
              const kind: PowerKind = roll < 0.12 ? "life" : roll < 0.56 ? "wide" : "multi";
              g.powers.push({ x: cx, y: cy, kind });
            }
            g.bricks.splice(i, 1);
            break;
          }
        }
      }

      // Lost balls
      const before = g.balls.length;
      if (!g.stuck) g.balls = g.balls.filter((b) => b.y - BALL_R <= H);
      if (!g.stuck && g.balls.length === 0) {
        g.lives -= 1;
        g.flash = 0.25;
        g.streak = 0;
        g.wideFor = 0;
        g.powers = [];
        g.balls = [{ x: g.paddleX, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0 }];
        g.stuck = true;
        changed = true;
      } else if (g.balls.length !== before) {
        changed = true;
      }

      // Power-ups
      const keep: Power[] = [];
      for (const p of g.powers) {
        p.y += 130 * dt;
        const caught =
          p.y + 8 >= PADDLE_Y && p.y - 8 <= PADDLE_Y + PADDLE_H && Math.abs(p.x - g.paddleX) <= paddleW(g) / 2 + 17;
        if (caught) {
          if (p.kind === "wide") g.wideFor = 12;
          else if (p.kind === "life") g.lives = Math.min(g.lives + 1, 5);
          else if (!g.stuck && g.balls.length) {
            const src = g.balls[0];
            const speed = Math.hypot(src.vx, src.vy);
            for (const a of [-0.5, 0.5]) {
              g.balls.push({ x: src.x, y: src.y, vx: speed * Math.sin(a), vy: -speed * Math.cos(a) });
            }
          }
          g.pops.push({ x: p.x, y: PADDLE_Y - 14, text: POWER_LABEL[p.kind], life: 1, color: "#ffffff" });
          changed = true;
          continue;
        }
        if (p.y < H + 10) keep.push(p);
      }
      g.powers = keep;

      g.shards = g.shards
        .map((s) => ({ ...s, x: s.x + s.vx * dt, y: s.y + s.vy * dt, vy: s.vy + 500 * dt, life: s.life - dt * 1.4 }))
        .filter((s) => s.life > 0);
      g.pops = g.pops
        .map((p) => ({ ...p, y: p.y - 34 * dt, life: p.life - dt * 1.3 }))
        .filter((p) => p.life > 0);
      g.flash = Math.max(0, g.flash - dt);

      // Level cleared — bonus, then a fresh wall.
      if (g.bricks.length === 0) {
        const bonus = 100 * g.level;
        g = world.current = fresh(g.level + 1, { score: g.score + bonus, lives: g.lives });
        g.last = t;
        g.pops.push({ x: W / 2, y: H / 2, text: `LEVEL CLEAR +${bonus}`, life: 1.6, color: "#ffffff" });
        changed = true;
      }

      render();
      if (changed) setHud({ score: g.score, lives: Math.max(0, g.lives), level: g.level });

      if (g.lives <= 0) {
        raf.current = null;
        setIsBest(submit(g.score));
        setPhase("over");
        void submitRun(g.score, g.level);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    },
    [render, submit, soundtrack, submitRun]
  );

  const start = useCallback(() => {
    soundtrack?.start(); // the beat lights the bricks
    const token = getFanToken();
    runToken.current = token ? startGameRun(token, GAME) : null;
    setEntry({ state: "idle" });
    world.current = fresh();
    setHud({ score: 0, lives: LIVES, level: 1 });
    setIsBest(false);
    setPhase("playing");
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  }, [tick, soundtrack]);

  // Keyboard: arrows / A-D to move, Space to launch (or start).
  useEffect(() => {
    const set = (e: KeyboardEvent, down: boolean) => {
      const g = world.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") g.left = down;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") g.right = down;
      else if (down && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        if (phase === "playing") launch(g);
        else start();
        return;
      } else return;
      if (phase === "playing") e.preventDefault();
    };
    const onDown = (e: KeyboardEvent) => set(e, true);
    const onUp = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [phase, start]);

  // Pause while the tab is hidden; resume without a time jump.
  useEffect(() => {
    const onVis = () => {
      if (phase !== "playing") return;
      if (document.hidden) {
        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = null;
      } else if (!raf.current) {
        world.current.last = 0;
        raf.current = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, tick]);

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  // Mouse / touch: the paddle follows the pointer; a tap launches the ball.
  function onPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    world.current.paddleX = ((e.clientX - rect.left) / rect.width) * W;
    if (e.type === "pointerdown") launch(world.current);
  }

  return (
    <GameShell slug="beat-breaker" best={best}>
      <div className="card mx-auto max-w-md overflow-hidden p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between px-1 text-sm">
          <span className="font-semibold text-white">
            Score <span className="font-display text-lg text-accent">{hud.score}</span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Level {hud.level}</span>
          <span aria-label={`${hud.lives} lives left`} className="tracking-widest text-accent">
            {"♥".repeat(Math.min(hud.lives, 5))}
            <span className="text-neutral-700">{"♥".repeat(Math.max(0, LIVES - hud.lives))}</span>
          </span>
        </div>
        <div className="relative">
          <canvas
            ref={canvasRef}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            className="block aspect-[3/4] w-full touch-none select-none rounded-2xl"
            aria-label="Beat Breaker playfield"
          />
          {phase !== "playing" && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-ink/80 p-6 backdrop-blur-sm">
              {phase === "ready" ? (
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-white">Beat Breaker</p>
                  <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left text-sm text-neutral-300">
                    <li>🧱 Smash every brick to clear the level</li>
                    <li>🥁 Bricks light up on the kick — break one on the beat for <b className="text-white">double points</b></li>
                    <li>🟨 Gold bricks drop power-ups: <b className="text-white">WIDE</b>, <b className="text-white">×3</b> balls, <b className="text-white">+♥</b></li>
                    <li>🛡️ Dark bricks take two hits</li>
                    <li>⌨️ Arrows / A-D + Space — or drag and tap on your phone</li>
                  </ul>
                  <p className="mx-auto mt-4 max-w-xs rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-white">
                    🏆 Top score this month wins <b>GH₵500</b>
                    {!user && <span className="block text-xs text-neutral-300">Sign in first so your score counts</span>}
                  </p>
                  <button type="button" onClick={start} className="btn-accent mt-5 min-h-[48px]">
                    Start
                  </button>
                </div>
              ) : (
                <GameOver title="Game over" score={`${hud.score} pts`} isBest={isBest} onRestart={start}>
                  <p className="mt-2 text-sm text-neutral-400">You reached level {hud.level}.</p>
                  <p className="mt-2 text-sm">
                    {!user ? (
                      <span className="text-neutral-300">
                        <Link href="/account" className="font-semibold text-accent underline">
                          Sign in
                        </Link>{" "}
                        to put your scores on the GH₵500 leaderboard.
                      </span>
                    ) : entry.state === "sending" ? (
                      <span className="text-neutral-400">Submitting to the leaderboard…</span>
                    ) : entry.state === "done" ? (
                      <span className="font-semibold text-white">
                        {entry.newBest ? "New monthly best! " : ""}Leaderboard rank #{entry.rank} (best{" "}
                        {entry.best.toLocaleString()})
                      </span>
                    ) : entry.state === "error" ? (
                      <span className="text-red-400">{entry.message}</span>
                    ) : null}
                  </p>
                </GameOver>
              )}
            </div>
          )}
        </div>
      </div>
      <PrizeLeaderboard game={GAME} refreshKey={boardKey} />
    </GameShell>
  );
}
