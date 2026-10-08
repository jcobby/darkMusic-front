"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, GameOver } from "./GameShell";
import { useSoundtrack, bassLevel, newFreqBuffer, type FreqBuffer } from "./Soundtrack";
import { useBestScore } from "@/lib/useBestScore";

// Logical playfield; the canvas is scaled to fit its container.
const W = 360;
const H = 480;
const CRATE_W = 76;
const CRATE_H = 26;
const CRATE_Y = H - 44;
const LIVES = 3;

type Kind = "record" | "gold" | "skull";
interface Drop {
  x: number;
  y: number;
  vy: number;
  r: number;
  kind: Kind;
  spin: number;
}
interface Pop {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}
interface World {
  crateX: number;
  drops: Drop[];
  pops: Pop[];
  score: number;
  lives: number;
  elapsed: number;
  spawnIn: number;
  flash: number;
  left: boolean;
  right: boolean;
  last: number;
  // Beat-sync: records drop on the kicks of the soundtrack
  bassAvg: number;
  sinceBeat: number;
  heardAt: number; // last time the music had any bass (seconds of play)
  pulse: number; // 0–1 glow that flashes on each beat
}

const fresh = (): World => ({
  crateX: W / 2,
  drops: [],
  pops: [],
  score: 0,
  lives: LIVES,
  elapsed: 0,
  spawnIn: 0.6,
  flash: 0,
  left: false,
  right: false,
  last: 0,
  bassAvg: 0,
  sinceBeat: 0,
  heardAt: -10,
  pulse: 0,
});

function drawRecord(ctx: CanvasRenderingContext2D, d: Drop) {
  const gold = d.kind === "gold";
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.spin);
  ctx.beginPath();
  ctx.arc(0, 0, d.r, 0, Math.PI * 2);
  ctx.fillStyle = gold ? "#e8b923" : "#111114";
  ctx.fill();
  ctx.strokeStyle = gold ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (const k of [0.82, 0.68, 0.55]) {
    ctx.beginPath();
    ctx.arc(0, 0, d.r * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Light sheen that turns with the record
  ctx.beginPath();
  ctx.arc(0, 0, d.r * 0.9, -0.6, 0.2);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, d.r * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = gold ? "#7a1010" : "#ef2b2d";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, d.r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = "#050507";
  ctx.fill();
  ctx.restore();
}

function draw(ctx: CanvasRenderingContext2D, g: World) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#14070a");
  bg.addColorStop(1, "#050507");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Stage lights — they kick with the bass of the soundtrack
  const glow = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, H * (0.8 + g.pulse * 0.25));
  glow.addColorStop(0, `rgba(239,43,45,${0.22 + g.pulse * 0.3})`);
  glow.addColorStop(1, "rgba(239,43,45,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  if (g.pulse > 0.05) {
    ctx.strokeStyle = `rgba(255,90,95,${g.pulse * 0.35})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
  }

  for (const d of g.drops) {
    if (d.kind === "skull") {
      ctx.font = `${d.r * 2}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💀", d.x, d.y);
    } else {
      drawRecord(ctx, d);
    }
  }

  // Crate
  const x = g.crateX - CRATE_W / 2;
  ctx.fillStyle = "#b3141b";
  ctx.beginPath();
  ctx.roundRect(x, CRATE_Y, CRATE_W, CRATE_H, 7);
  ctx.fill();
  ctx.fillStyle = "#ef2b2d";
  ctx.fillRect(x + 4, CRATE_Y, CRATE_W - 8, 4);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DMY", g.crateX, CRATE_Y + CRATE_H / 2 + 2);

  for (const p of g.pops) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;

  if (g.flash > 0) {
    ctx.fillStyle = `rgba(239,43,45,${g.flash * 1.6})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Catch falling records in the DMY crate; skulls and missed records cost a life. */
export function VinylCatch() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const world = useRef<World>(fresh());
  const raf = useRef<number | null>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [hud, setHud] = useState({ score: 0, lives: LIVES });
  const [isBest, setIsBest] = useState(false);
  const { best, submit } = useBestScore("vinyl-catch");
  const soundtrack = useSoundtrack();
  const freq = useRef<FreqBuffer>(newFreqBuffer());

  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, world.current);
  }, []);

  // Size the canvas for crisp drawing on high-DPI screens.
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
      const g = world.current;
      const dt = g.last ? Math.min(0.033, (t - g.last) / 1000) : 0;
      g.last = t;
      g.elapsed += dt;
      const speed = 1 + g.elapsed / 25; // everything speeds up over time

      if (g.left) g.crateX -= 340 * dt;
      if (g.right) g.crateX += 340 * dt;
      g.crateX = Math.max(CRATE_W / 2, Math.min(W - CRATE_W / 2, g.crateX));

      const spawn = (strong: boolean) => {
        const roll = Math.random();
        const skullChance = Math.min(0.32, 0.2 + g.elapsed * 0.002);
        // Big kicks are more likely to drop a gold record.
        const goldChance = strong ? 0.18 : 0.09;
        const kind: Kind = roll < skullChance ? "skull" : roll < skullChance + goldChance ? "gold" : "record";
        const r = kind === "gold" ? 15 : 17;
        g.drops.push({ x: r + Math.random() * (W - 2 * r), y: -r, vy: 110 + Math.random() * 60, r, kind, spin: 0 });
      };

      // Listen to the soundtrack: a kick well above the running bass average drops a record.
      const level = bassLevel(soundtrack?.analyser.current ?? null, freq.current);
      if (level > 8) g.heardAt = g.elapsed;
      const onBeat = level > g.bassAvg * 1.25 + 6 && level > 90;
      g.bassAvg = g.bassAvg * 0.9 + level * 0.1;
      g.sinceBeat += dt;
      g.pulse = Math.max(0, g.pulse - dt * 3.5);
      const musicOn = g.elapsed - g.heardAt < 1;
      const minGap = Math.max(0.3, 0.55 - g.elapsed * 0.004);

      if (musicOn) {
        if (onBeat && g.sinceBeat >= minGap) {
          spawn(level > g.bassAvg * 1.6);
          g.sinceBeat = 0;
          g.pulse = 1;
        } else if (g.sinceBeat > 1.4) {
          spawn(false); // quiet stretch of the beat — keep the records coming
          g.sinceBeat = 0;
        }
      } else {
        g.spawnIn -= dt;
        if (g.spawnIn <= 0) {
          spawn(false);
          g.spawnIn = Math.max(0.32, 0.85 - g.elapsed * 0.01) * (0.7 + Math.random() * 0.6);
        }
      }

      let changed = false;
      const keep: Drop[] = [];
      for (const d of g.drops) {
        d.y += d.vy * speed * dt;
        d.spin += dt * 5;
        const inCrateBand = d.y + d.r >= CRATE_Y && d.y - d.r <= CRATE_Y + CRATE_H;
        if (inCrateBand && Math.abs(d.x - g.crateX) <= CRATE_W / 2 + d.r * 0.3) {
          changed = true;
          if (d.kind === "skull") {
            g.lives -= 1;
            g.flash = 0.25;
            g.pops.push({ x: d.x, y: CRATE_Y - 10, text: "-1 ♥", life: 1, color: "#ff5a5f" });
          } else {
            const pts = d.kind === "gold" ? 5 : 1;
            g.score += pts;
            g.pops.push({ x: d.x, y: CRATE_Y - 10, text: `+${pts}`, life: 1, color: d.kind === "gold" ? "#f5c542" : "#ffffff" });
          }
          continue;
        }
        if (d.y - d.r > H) {
          if (d.kind === "record") {
            g.lives -= 1; // a dropped record costs a life; missed gold/skulls don't
            g.flash = 0.18;
            changed = true;
          }
          continue;
        }
        keep.push(d);
      }
      g.drops = keep;
      g.pops = g.pops
        .map((p) => ({ ...p, y: p.y - 40 * dt, life: p.life - dt * 1.4 }))
        .filter((p) => p.life > 0);
      g.flash = Math.max(0, g.flash - dt);

      render();
      if (changed) setHud({ score: g.score, lives: Math.max(0, g.lives) });

      if (g.lives <= 0) {
        raf.current = null;
        setIsBest(submit(g.score));
        setPhase("over");
        return;
      }
      raf.current = requestAnimationFrame(tick);
    },
    [render, submit, soundtrack]
  );

  const start = useCallback(() => {
    soundtrack?.start(); // the beat drives the drops
    world.current = fresh();
    setHud({ score: 0, lives: LIVES });
    setIsBest(false);
    setPhase("playing");
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  }, [tick, soundtrack]);

  // Keyboard: arrows / A-D to move, Space or Enter to start.
  useEffect(() => {
    const set = (e: KeyboardEvent, down: boolean) => {
      const g = world.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") g.left = down;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") g.right = down;
      else if (down && (e.key === " " || e.key === "Enter") && phase !== "playing") {
        e.preventDefault();
        start();
        return;
      } else return;
      if (phase === "playing") e.preventDefault(); // don't scroll the page
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

  // Mouse / touch: the crate follows the pointer.
  function onPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    world.current.crateX = ((e.clientX - rect.left) / rect.width) * W;
  }

  return (
    <GameShell slug="vinyl-catch" best={best}>
      <div className="card mx-auto max-w-md overflow-hidden p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between px-1 text-sm">
          <span className="font-semibold text-white">
            Score <span className="font-display text-lg text-accent">{hud.score}</span>
          </span>
          <span aria-label={`${hud.lives} lives left`} className="tracking-widest text-accent">
            {"♥".repeat(hud.lives)}
            <span className="text-neutral-700">{"♥".repeat(LIVES - hud.lives)}</span>
          </span>
        </div>
        <div className="relative">
          <canvas
            ref={canvasRef}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            className="block aspect-[3/4] w-full touch-none select-none rounded-2xl"
            aria-label="Vinyl Catch playfield"
          />
          {phase !== "playing" && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-ink/80 p-6 backdrop-blur-sm">
              {phase === "ready" ? (
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-white">Vinyl Catch</p>
                  <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left text-sm text-neutral-300">
                    <li>🎵 Catch records: <b className="text-white">+1</b></li>
                    <li>🥇 Gold records: <b className="text-white">+5</b></li>
                    <li>💀 Skulls, or dropping a record, cost a life</li>
                    <li>🥁 Records drop on the kicks of the free beat playing</li>
                    <li>⌨️ Arrow keys / A-D — or drag on your phone</li>
                  </ul>
                  <button type="button" onClick={start} className="btn-accent mt-6">
                    Start
                  </button>
                </div>
              ) : (
                <GameOver title="Game over" score={`${hud.score} pts`} isBest={isBest} onRestart={start} />
              )}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
