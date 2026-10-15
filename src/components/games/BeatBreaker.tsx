"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GameShell, GameOver, GameOverlay } from "./GameShell";
import { useSoundtrack, bassLevel, newFreqBuffer, type FreqBuffer } from "./Soundtrack";
import { useBestScore } from "@/lib/useBestScore";
import { startGameRun, submitGameScore, unlockUnreleased } from "@/lib/api";
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
const MAX_BALLS = 6; // multiball can't snowball past this
const MAX_SHARDS = 120; // brick sparks on screen at once
const HUD_MS = 150; // update the score line at most ~7× a second (each update re-renders the page)

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

/**
 * A soft round glow, drawn once and then stretched/stamped with drawImage —
 * far cheaper on phones than canvas shadowBlur or a new gradient every frame.
 */
const glowSprites = new Map<string, HTMLCanvasElement>();
function glow(rgb: string): HTMLCanvasElement {
  let c = glowSprites.get(rgb);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const grad = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.45, `rgba(${rgb},0.35)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, 128, 128);
    glowSprites.set(rgb, c);
  }
  return c;
}

function draw(ctx: CanvasRenderingContext2D, g: World) {
  // The dark background is the canvas's CSS background; only the moving parts are drawn.
  ctx.clearRect(0, 0, W, H);
  // Beat glow behind the wall — grows and brightens on each kick
  const r = H * (0.6 + g.pulse * 0.3);
  ctx.globalAlpha = 0.12 + g.pulse * 0.28;
  ctx.drawImage(glow("255,31,61"), W / 2 - r, TOP + 40 - r, r * 2, r * 2);
  ctx.globalAlpha = 1;

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
  const halo = 14 + g.pulse * 10;
  ctx.globalAlpha = 0.55 + g.pulse * 0.35;
  ctx.drawImage(glow("255,31,61"), px - halo, PADDLE_Y - halo, pw + halo * 2, PADDLE_H + halo * 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#c8001e";
  ctx.beginPath();
  ctx.roundRect(px, PADDLE_Y, pw, PADDLE_H, 5);
  ctx.fill();
  ctx.fillStyle = "#ff1f3d";
  ctx.fillRect(px + 5, PADDLE_Y, pw - 10, 3);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 8px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DMY", g.paddleX, PADDLE_Y + PADDLE_H / 2 + 1);

  // Balls
  const ballGlow = glow("255,92,112");
  ctx.fillStyle = "#ffffff";
  for (const b of g.balls) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(ballGlow, b.x - 15, b.y - 15, 30, 30);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
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
  const hudDirty = useRef(false);
  const hudShown = useRef({ level: 1, lives: LIVES, at: 0 });
  const { user } = useFanAuth();
  // Signed-in players' runs count for the monthly prize: a server token marks when each run began.
  const runToken = useRef<Promise<string | null> | null>(null);
  const [entry, setEntry] = useState<Entry>({ state: "idle" });
  const [boardKey, setBoardKey] = useState(0);
  // Music by level: beats, then Lenko Psycho songs, then the unreleased track.
  const plan = soundtrack?.music;
  const unlockAsked = useRef(false);
  const songsAnnounced = useRef(false);
  const [unlocked, setUnlocked] = useState<{ title: string; artist: string } | null>(null);
  const [banner, setBanner] = useState(false);

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
        let rows = 1;
        for (const b of g.bricks) if (b.row + 1 > rows) rows = b.row + 1;
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
            // Plenty of sparks, but capped so multiball can't flood a slow phone.
            for (let k = 0; k < 8 && g.shards.length < MAX_SHARDS; k++) {
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
      if (!g.stuck) {
        let n = 0;
        for (const b of g.balls) if (b.y - BALL_R <= H) g.balls[n++] = b;
        g.balls.length = n;
      }
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

      // Power-ups (updated in place — no new arrays every frame)
      let kept = 0;
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
              if (g.balls.length >= MAX_BALLS) break;
              g.balls.push({ x: src.x, y: src.y, vx: speed * Math.sin(a), vy: -speed * Math.cos(a) });
            }
          }
          g.pops.push({ x: p.x, y: PADDLE_Y - 14, text: POWER_LABEL[p.kind], life: 1, color: "#ffffff" });
          changed = true;
          continue;
        }
        if (p.y < H + 10) g.powers[kept++] = p;
      }
      g.powers.length = kept;

      // Sparks and score pops, also in place: a phone's garbage collector
      // pausing to clean up thousands of throwaway objects shows up as stutter.
      kept = 0;
      for (const s of g.shards) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 500 * dt;
        s.life -= dt * 1.4;
        if (s.life > 0) g.shards[kept++] = s;
      }
      g.shards.length = kept;
      kept = 0;
      for (const p of g.pops) {
        p.y -= 34 * dt;
        p.life -= dt * 1.3;
        if (p.life > 0) g.pops[kept++] = p;
      }
      g.pops.length = kept;
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
      // The score line re-renders the page, so a burst of hits updates it at most
      // every HUD_MS; a new level or a lost/gained life shows straight away.
      if (changed) hudDirty.current = true;
      const shown = hudShown.current;
      if (hudDirty.current && (g.level !== shown.level || g.lives !== shown.lives || t - shown.at >= HUD_MS)) {
        hudDirty.current = false;
        hudShown.current = { level: g.level, lives: g.lives, at: t };
        setHud({ score: g.score, lives: Math.max(0, g.lives), level: g.level });
      }

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
    soundtrack?.setStage("beats"); // every run starts on the beats
    soundtrack?.start(); // the beat lights the bricks
    // Everyone gets a run token (it proves how long they've played, for the unreleased
    // track); signed-in players' runs also go on the prize board.
    runToken.current = startGameRun(getFanToken(), GAME);
    unlockAsked.current = false;
    songsAnnounced.current = false;
    setUnlocked(null);
    setBanner(false);
    setEntry({ state: "idle" });
    world.current = fresh();
    hudDirty.current = false;
    hudShown.current = { level: 1, lives: LIVES, at: 0 };
    setHud({ score: 0, lives: LIVES, level: 1 });
    setIsBest(false);
    setPhase("playing");
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    // On a phone the paddle can sit below the fold — bring the whole board into view.
    requestAnimationFrame(() => canvasRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }, [tick, soundtrack]);

  // While playing, freeze the page's decorative animations (see globals.css).
  useEffect(() => {
    const el = document.documentElement;
    if (phase === "playing") el.setAttribute("data-game-running", "");
    else el.removeAttribute("data-game-running");
    return () => el.removeAttribute("data-game-running");
  }, [phase]);

  // Change the music as the player levels up.
  useEffect(() => {
    if (phase !== "playing" || !soundtrack || !plan) return;
    const level = hud.level;
    if (plan.hasUnreleased && level >= plan.unreleasedFromLevel) {
      if (unlockAsked.current) return;
      unlockAsked.current = true;
      void (async () => {
        try {
          const run = await runToken.current;
          if (!run) throw new Error("No run");
          const u = await unlockUnreleased(getFanToken(), GAME, run, level);
          soundtrack.playUnreleased(u);
          setUnlocked({ title: u.title, artist: u.artist });
          setBanner(true);
          world.current.pops.push({ x: W / 2, y: H / 2 + 44, text: "UNRELEASED TRACK UNLOCKED", life: 2.6, color: "#facc15" });
        } catch {
          soundtrack.setStage("songs"); // couldn't verify — carry on with the songs
        }
      })();
      return;
    }
    const songs = plan.songs.length > 0 && level >= plan.songsFromLevel;
    if (songs && !songsAnnounced.current) {
      songsAnnounced.current = true;
      world.current.pops.push({ x: W / 2, y: H / 2 + 44, text: "NOW PLAYING: LENKO PSYCHO", life: 2.2, color: "#ff5c70" });
    }
    soundtrack.setStage(songs ? "songs" : "beats");
  }, [hud.level, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // The "unlocked" banner shows for a few seconds.
  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(false), 7000);
    return () => clearTimeout(id);
  }, [banner]);

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
    <GameShell
      slug="beat-breaker"
      best={best}
      extra={
        <Link
          href="/games/leaderboard"
          className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-accent/50 bg-accent/10 px-4 text-sm font-semibold text-white transition hover:border-accent"
        >
          🏆 GH₵500 leaderboard<span className="hidden sm:inline"> — see who&apos;s winning</span> <span aria-hidden>→</span>
        </Link>
      }
    >
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
            className="block aspect-[3/4] w-full touch-none select-none scroll-mb-4 scroll-mt-24 rounded-2xl bg-[linear-gradient(180deg,#14070a,#050507)]"
            aria-label="Beat Breaker playfield"
          />
          {banner && unlocked && phase === "playing" && (
            <div
              role="status"
              className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-2xl border border-yellow-400/70 bg-ink/90 px-4 py-3 text-center shadow-[0_0_32px_rgba(250,204,21,0.25)] backdrop-blur-sm"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-yellow-400">🔓 Unreleased track unlocked</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{unlocked.title}</p>
              <p className="text-xs text-neutral-300">
                {unlocked.artist} · not out anywhere yet — you&apos;re one of the first to hear it
              </p>
            </div>
          )}
          {phase !== "playing" && (
            <GameOverlay>
              {phase === "ready" ? (
                <div className="text-center">
                  <p className="font-display text-2xl font-bold text-white sm:text-3xl">Beat Breaker</p>
                  {/* Start comes first, so it's on screen on every phone */}
                  <button type="button" onClick={start} className="btn-accent mt-3 min-h-[52px] w-full max-w-[14rem] text-base sm:mt-4">
                    ▶ Start
                  </button>
                  <p className="mx-auto mt-3 max-w-xs rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-white">
                    🏆 Top score this month wins <b>GH₵500</b>
                    {!user && <span className="block text-xs text-neutral-300">Sign in first so your score counts</span>}
                  </p>
                  <ul className="mx-auto mt-3 max-w-xs space-y-1 text-left text-xs leading-snug text-neutral-300 sm:text-sm">
                    <li>🧱 Clear every brick to level up · 🛡️ dark bricks take two hits</li>
                    <li>🥁 Break a brick on the kick for <b className="text-white">double points</b></li>
                    <li>🟨 Gold bricks drop <b className="text-white">WIDE</b>, <b className="text-white">×3</b> balls, <b className="text-white">+♥</b></li>
                    {plan && plan.songs.length > 0 && (
                      <li>
                        🎵 Level {plan.songsFromLevel}+: <b className="text-white">Lenko Psycho songs</b>
                      </li>
                    )}
                    {plan?.hasUnreleased && (
                      <li>
                        🔒 Level {plan.unreleasedFromLevel}: an <b className="text-yellow-400">unreleased Lenko track</b>
                      </li>
                    )}
                    <li>👆 Drag to move, tap to launch · ⌨️ arrows + Space</li>
                  </ul>
                </div>
              ) : (
                <GameOver title="Game over" score={`${hud.score} pts`} isBest={isBest} onRestart={start}>
                  <p className="mt-2 text-sm text-neutral-400">You reached level {hud.level}.</p>
                  {unlocked ? (
                    <p className="mt-2 text-sm font-semibold text-yellow-400">
                      🔓 You unlocked the unreleased track “{unlocked.title}” this run.
                    </p>
                  ) : plan?.hasUnreleased && hud.level < plan.unreleasedFromLevel ? (
                    <p className="mt-2 text-xs text-neutral-400">
                      🔒 {plan.unreleasedFromLevel - hud.level} more level{plan.unreleasedFromLevel - hud.level === 1 ? "" : "s"} to unlock
                      the unreleased Lenko track.
                    </p>
                  ) : null}
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
                        {entry.best.toLocaleString()}) ·{" "}
                        <Link href="/games/leaderboard" className="text-accent underline">
                          See the board
                        </Link>
                      </span>
                    ) : entry.state === "error" ? (
                      <span className="text-red-400">{entry.message}</span>
                    ) : null}
                  </p>
                </GameOver>
              )}
            </GameOverlay>
          )}
        </div>
      </div>
      <PrizeLeaderboard game={GAME} refreshKey={boardKey} />
    </GameShell>
  );
}
