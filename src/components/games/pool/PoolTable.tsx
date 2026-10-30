"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { W, H, R, POCKETS, HEAD_X, simulate, canPlaceCue, freeCueSpot, groupOf, type BallState, type Group, type Shot } from "@/lib/pool/engine";
import { CUES } from "@/lib/pool/cues";
import type { CueDesign } from "@/lib/api";

/*
 * The DMY Pool table: draws the balls, lets the shooter aim (drag or tap towards
 * where to send the cue ball, nudge for fine aim), place the cue ball with ball in
 * hand, pick the power and shoot — and animates shots, its own and the opponent's,
 * with the same engine the server uses. On a phone the table stands upright.
 */

const RAIL = 34; // cushion width around the cloth (logical units)
const TW = W + 2 * RAIL;
const TH = H + 2 * RAIL;
const COLORS: Record<number, string> = { 1: "#f5c400", 2: "#1f4fd1", 3: "#d42020", 4: "#6a2bbf", 5: "#f07a10", 6: "#1a8a3a", 7: "#7a1f1f", 8: "#111111" };
const colorOf = (id: number) => COLORS[id > 8 ? id - 8 : id];
const STEPS_PER_FRAME = 4; // 240 simulation steps a second at 60 fps → real time

export interface Playback {
  key: number; // a new key plays it
  start: BallState[];
  shot: Shot;
}

interface View {
  s: number; // pixels per logical unit
  portrait: boolean;
  w: number; // CSS pixels
  h: number;
}

/** Logical table point → canvas pixel (portrait: the head of the table at the bottom). */
function toScreen(v: View, x: number, y: number): [number, number] {
  return v.portrait ? [(y + RAIL) * v.s, (W + RAIL - x) * v.s] : [(x + RAIL) * v.s, (y + RAIL) * v.s];
}
function fromScreen(v: View, sx: number, sy: number): [number, number] {
  return v.portrait ? [W + RAIL - sy / v.s, sx / v.s - RAIL] : [sx / v.s - RAIL, sy / v.s - RAIL];
}

/** Where the aim line meets its first ball (the ghost ball) or the cushion. */
function aimPreview(balls: BallState[], cx: number, cy: number, dx: number, dy: number) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  let best = Infinity;
  let hit: BallState | null = null;
  for (const b of balls) {
    if (b.id === 0 || b.potted) continue;
    const fx = b.x - cx;
    const fy = b.y - cy;
    const t = fx * ux + fy * uy;
    if (t <= 0) continue;
    const d2 = fx * fx + fy * fy - t * t;
    if (d2 > 4 * R * R) continue;
    const tt = t - Math.sqrt(4 * R * R - d2);
    if (tt < best) {
      best = tt;
      hit = b;
    }
  }
  const tx = ux > 0 ? (W - R - cx) / ux : ux < 0 ? (R - cx) / ux : Infinity;
  const ty = uy > 0 ? (H - R - cy) / uy : uy < 0 ? (R - cy) / uy : Infinity;
  const wall = Math.min(tx, ty);
  if (!hit || wall < best) return { gx: cx + ux * wall, gy: cy + uy * wall, hit: null as BallState | null };
  return { gx: cx + ux * best, gy: cy + uy * best, hit };
}

function drawTable(ctx: CanvasRenderingContext2D, v: View) {
  ctx.clearRect(0, 0, v.w, v.h);
  // Wooden rails (lit from above), with a soft bevel
  const wood = v.portrait ? ctx.createLinearGradient(0, 0, v.w, 0) : ctx.createLinearGradient(0, 0, 0, v.h);
  wood.addColorStop(0, "#5b2a14");
  wood.addColorStop(0.5, "#3a1608");
  wood.addColorStop(1, "#24090a");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.roundRect(0, 0, v.w, v.h, 18 * v.s);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(2.5, 2.5, v.w - 5, v.h - 5, 16 * v.s);
  ctx.stroke();
  const [x0, y0] = toScreen(v, 0, 0);
  const [x1, y1] = toScreen(v, W, H);
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  const cw = Math.abs(x1 - x0);
  const ch = Math.abs(y1 - y0);
  // The cushions: a band of brighter cloth round the bed
  const cush = 10 * v.s;
  ctx.fillStyle = "#4f1675";
  ctx.fillRect(left - cush, top - cush, cw + 2 * cush, ch + 2 * cush);
  // The bed: lit in the middle, falling off to the cushions
  const g = ctx.createRadialGradient(left + cw / 2, top + ch / 2, 10, left + cw / 2, top + ch / 2, Math.max(cw, ch) * 0.7);
  g.addColorStop(0, "#4a1272");
  g.addColorStop(0.65, "#2c0a44");
  g.addColorStop(1, "#1c062b");
  ctx.fillStyle = g;
  ctx.fillRect(left, top, cw, ch);
  ctx.strokeStyle = "rgba(191,0,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(left, top, cw, ch);
  // Diamonds (sights) on the rails
  const sight = Math.max(2.5, 4.5 * v.s);
  const spots: [number, number][] = [
    ...[1, 2, 3, 5, 6, 7].flatMap((k): [number, number][] => [
      [(W * k) / 8, -RAIL * 0.55],
      [(W * k) / 8, H + RAIL * 0.55],
    ]),
    ...[1, 2, 3].flatMap((k): [number, number][] => [
      [-RAIL * 0.55, (H * k) / 4],
      [W + RAIL * 0.55, (H * k) / 4],
    ]),
  ];
  ctx.fillStyle = "rgba(243,227,195,0.85)";
  for (const [x, y] of spots) {
    const [sx, sy] = toScreen(v, x, y);
    ctx.beginPath();
    ctx.moveTo(sx, sy - sight);
    ctx.lineTo(sx + sight * 0.7, sy);
    ctx.lineTo(sx, sy + sight);
    ctx.lineTo(sx - sight * 0.7, sy);
    ctx.closePath();
    ctx.fill();
  }
  // Head line and foot spot
  const [hx0, hy0] = toScreen(v, HEAD_X, 0);
  const [hx1, hy1] = toScreen(v, HEAD_X, H);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(hx0, hy0);
  ctx.lineTo(hx1, hy1);
  ctx.stroke();
  ctx.setLineDash([]);
  // DMY mark in the middle
  const [mx, my] = toScreen(v, W / 2, H / 2);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.font = `bold ${Math.round(60 * v.s)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DMY", mx, my);
  // Pockets: a dark rim, then the drop
  for (const p of POCKETS) {
    const [px, py] = toScreen(v, p.x, p.y);
    const pr = p.r * 0.95 * v.s;
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.18, 0, Math.PI * 2);
    ctx.fill();
    const hole = ctx.createRadialGradient(px, py, 0, px, py, pr);
    hole.addColorStop(0, "#000");
    hole.addColorStop(0.75, "#030303");
    hole.addColorStop(1, "#141414");
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, v: View, b: { id: number; x: number; y: number }, alpha = 1) {
  const [sx, sy] = toScreen(v, b.x, b.y);
  const r = R * v.s;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0,0,0,0.35)"; // shadow
  ctx.beginPath();
  ctx.arc(sx + r * 0.2, sy + r * 0.25, r, 0, Math.PI * 2);
  ctx.fill();
  if (b.id === 0) {
    ctx.fillStyle = "#f8f8f8";
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.id > 8) {
    // Stripe: white with a coloured band
    ctx.fillStyle = "#f4f4f4";
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = colorOf(b.id);
    if (v.portrait) ctx.fillRect(sx - r * 0.55, sy - r, r * 1.1, r * 2);
    else ctx.fillRect(sx - r, sy - r * 0.55, r * 2, r * 1.1);
    ctx.restore();
  } else {
    ctx.fillStyle = colorOf(b.id);
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (b.id !== 0 && r >= 6) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = `bold ${Math.max(7, Math.round(r * 0.62))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(b.id), sx, sy + 0.5);
  } else if (b.id !== 0) {
    ctx.fillStyle = "rgba(255,255,255,0.8)"; // too small for a number: just the white spot
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  // Round it: light from the top left, falling into shadow at the far edge
  const shade = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r * 1.05);
  shade.addColorStop(0, "rgba(255,255,255,0.5)");
  shade.addColorStop(0.35, "rgba(255,255,255,0.06)");
  shade.addColorStop(0.8, "rgba(0,0,0,0.12)");
  shade.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  // Shine
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(sx - r * 0.38, sy - r * 0.42, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function PoolTable({
  balls,
  playback,
  onPlayed,
  canShoot,
  ballInHand,
  breakShot,
  kitchen = false,
  target,
  onShoot,
  cueDesign = "classic",
}: {
  balls: BallState[]; // the table at rest
  playback: Playback | null; // a shot to animate first
  onPlayed: () => void;
  canShoot: boolean;
  ballInHand: boolean;
  breakShot: boolean;
  kitchen?: boolean; // ball in hand behind the head line after a scratch on the break
  target: Group | "eight" | null; // the shooter's balls (highlighted)
  onShoot: (shot: Shot, cue?: { x: number; y: number }) => void;
  cueDesign?: CueDesign; // the player's cue (VIPs and Legends have the exclusive ones)
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [aim, setAim] = useState({ dx: 1, dy: 0 });
  const [power, setPower] = useState(0.55);
  const [cue, setCue] = useState<{ x: number; y: number } | null>(null);
  const [animating, setAnimating] = useState(false);
  const drag = useRef<{ mode: "cue" | "aim"; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null);
  const shownKey = useRef<number | null>(null);

  // Size the table to the space (and the phone's height, standing upright). A phone's
  // browser bar sliding in and out changes the height a little all the time: that's
  // ignored, as every resize clears the canvas.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let last = { cw: 0, vh: 0 };
    const fit = () => {
      const cw = el.clientWidth;
      const vh = window.innerHeight;
      if (cw === last.cw && Math.abs(vh - last.vh) < 150) return;
      last = { cw, vh };
      const portrait = cw < 640;
      const maxH = Math.max(320, vh - 230);
      const w = portrait ? Math.min(cw, (maxH * TH) / TW) : cw;
      const s = portrait ? w / TH : w / TW;
      setView({ s, portrait, w, h: portrait ? TW * s : TH * s });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  // Ball in hand: start the cue ball where it is (or behind the head line when it has to be),
  // or the nearest free spot. Keyed on the cue ball's place, so a refresh of the same table
  // doesn't undo where you put it.
  const behindLine = breakShot || kitchen;
  const restCue = balls.find((b) => b.id === 0);
  const ballsRef = useRef(balls);
  ballsRef.current = balls;
  const [rx, ry, rp] = [restCue?.x, restCue?.y, restCue?.potted];
  useEffect(() => {
    if (!ballInHand) return setCue(null);
    const x = rx !== undefined && !rp && (!behindLine || rx <= HEAD_X) ? rx : HEAD_X * 0.8;
    const y = ry !== undefined && !rp ? ry : H / 2;
    setCue(canPlaceCue(ballsRef.current, x, y, behindLine) ? { x, y } : freeCueSpot(ballsRef.current, behindLine));
  }, [ballInHand, behindLine, rx, ry, rp]);

  const cueAt = cue ?? (restCue && !restCue.potted ? { x: restCue.x, y: restCue.y } : { x: HEAD_X, y: H / 2 });
  const placeOk = !ballInHand || canPlaceCue(balls, cueAt.x, cueAt.y, behindLine);
  const shown = useMemo(() => balls.map((b) => (b.id === 0 ? { ...b, x: cueAt.x, y: cueAt.y, potted: false } : b)), [balls, cueAt.x, cueAt.y]);

  const paint = useCallback(
    (list: readonly BallState[], overlay: boolean) => {
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx || !view) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTable(ctx, view);
      if (overlay) {
        // Aim line, ghost ball, where the object ball goes
        const p = aimPreview(list as BallState[], cueAt.x, cueAt.y, aim.dx, aim.dy);
        const [cx, cy] = toScreen(view, cueAt.x, cueAt.y);
        const [gx, gy] = toScreen(view, p.gx, p.gy);
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(gx, gy, R * view.s, 0, Math.PI * 2);
        ctx.stroke();
        if (p.hit) {
          const ox = p.hit.x - p.gx;
          const oy = p.hit.y - p.gy;
          const ol = Math.sqrt(ox * ox + oy * oy) || 1;
          const [hx, hy] = toScreen(view, p.hit.x, p.hit.y);
          const [ex, ey] = toScreen(view, p.hit.x + (ox / ol) * 90, p.hit.y + (oy / ol) * 90);
          ctx.strokeStyle = "rgba(250,204,21,0.85)";
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
      }
      for (const b of list) {
        if (b.potted) continue;
        const isCue = b.id === 0;
        const mine = target === "eight" ? b.id === 8 : target ? groupOf(b.id) === target : false;
        if (overlay && mine) {
          const [sx, sy] = toScreen(view, b.x, b.y);
          ctx.strokeStyle = "rgba(250,204,21,0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, R * view.s + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawBall(ctx, view, b, isCue && overlay && ballInHand && !placeOk ? 0.45 : 1);
        if (isCue && overlay && ballInHand) {
          const [sx, sy] = toScreen(view, b.x, b.y);
          ctx.strokeStyle = placeOk ? "rgba(52,211,153,0.9)" : "rgba(248,113,113,0.9)";
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(sx, sy, R * view.s * 2.2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      if (overlay) {
        // The cue stick, pulled back by the power — over the balls, like a real one
        const len = Math.sqrt(aim.dx * aim.dx + aim.dy * aim.dy) || 1;
        const back = R * 1.6 + power * 70;
        const [s0x, s0y] = toScreen(view, cueAt.x - (aim.dx / len) * back, cueAt.y - (aim.dy / len) * back);
        const [s1x, s1y] = toScreen(view, cueAt.x - (aim.dx / len) * (back + 260), cueAt.y - (aim.dy / len) * (back + 260));
        ctx.strokeStyle = "rgba(0,0,0,0.35)"; // its shadow
        ctx.lineWidth = Math.max(3, 5 * view.s);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(s0x + 2, s0y + 3);
        ctx.lineTo(s1x + 2, s1y + 3);
        ctx.stroke();
        // Their cue design: butt → shaft, a glow for the members' cues, then the tip
        const look = CUES[cueDesign] ?? CUES.classic;
        const grad = ctx.createLinearGradient(s1x, s1y, s0x, s0y);
        grad.addColorStop(0, look.from);
        grad.addColorStop(1, look.to);
        ctx.strokeStyle = grad;
        if (look.glow) {
          ctx.shadowColor = look.glow;
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.moveTo(s0x, s0y);
        ctx.lineTo(s1x, s1y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        const [tx, ty] = toScreen(view, cueAt.x - (aim.dx / len) * (back + 9), cueAt.y - (aim.dy / len) * (back + 9));
        ctx.strokeStyle = look.tip;
        ctx.beginPath();
        ctx.moveTo(s0x, s0y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.lineCap = "butt";
      }
    },
    [view, cueAt.x, cueAt.y, aim.dx, aim.dy, power, target, ballInHand, placeOk, cueDesign]
  );

  // Canvas size
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !view) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(view.w * dpr);
    c.height = Math.round(view.h * dpr);
  }, [view]);

  // Play a shot (its own animation loop), then hand back. The loop reads the latest
  // drawing code through a ref, so a resize or a re-render mid-shot can't cancel it —
  // that used to leave a blank table that never came back.
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const onPlayedRef = useRef(onPlayed);
  onPlayedRef.current = onPlayed;
  const sized = view !== null;
  useEffect(() => {
    if (!playback || !sized || shownKey.current === playback.key) return;
    shownKey.current = playback.key;
    const frames: BallState[][] = [];
    const result = simulate(playback.start, playback.shot, (list, step) => {
      if (step % STEPS_PER_FRAME === 0) frames.push(list.map((b) => ({ id: b.id, x: b.x, y: b.y, potted: b.potted })));
    });
    frames.push(result.balls);
    setAnimating(true);
    let raf = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setAnimating(false);
      onPlayedRef.current();
    };
    const t0 = performance.now();
    const tick = (t: number) => {
      // Real time, whatever the screen's refresh rate (a frame's time can be a touch before t0)
      const i = Math.max(0, Math.min(frames.length - 1, Math.floor(((t - t0) / 1000) * 60)));
      paintRef.current(frames[i], false);
      if (i < frames.length - 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      finish();
    };
  }, [playback, sized]);

  // The table at rest (with the aim when it's your shot)
  useEffect(() => {
    if (animating || (playback && shownKey.current !== playback.key)) return;
    paint(canShoot ? shown : balls, canShoot);
  }, [paint, shown, balls, canShoot, animating, playback]);

  /*
   * Aiming: a tap points the cue at that spot; a drag turns the cue around the cue ball
   * by however far the finger turns — it never jumps to where the finger lands, and the
   * further from the cue ball you drag, the finer the turn. Near the cue ball (where a
   * finger can't tell directions apart) moves are ignored. With ball in hand, a press
   * on or near the cue ball moves it instead.
   */
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return view ? fromScreen(view, e.clientX - rect.left, e.clientY - rect.top) : [0, 0];
  };
  const aimAt = (x: number, y: number) => {
    const dx = x - cueAt.x;
    const dy = y - cueAt.y;
    if (dx * dx + dy * dy > (R * 2) ** 2) setAim({ dx, dy });
  };
  const deadZone = () => Math.max(R * 3, view ? 22 / view.s : 0); // ~22px on screen
  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canShoot || animating) return;
    const [x, y] = point(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const near = (x - cueAt.x) ** 2 + (y - cueAt.y) ** 2 < deadZone() ** 2;
    drag.current = { mode: ballInHand && near ? "cue" : "aim", x, y, sx: e.clientX, sy: e.clientY, moved: false };
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d || !canShoot || animating) return;
    const [x, y] = point(e);
    if (d.mode === "cue") {
      setCue({ x: Math.max(R, Math.min(W - R, behindLine ? Math.min(x, HEAD_X) : x)), y: Math.max(R, Math.min(H - R, y)) });
      return;
    }
    if (!d.moved && (e.clientX - d.sx) ** 2 + (e.clientY - d.sy) ** 2 < 36) return; // still a tap
    d.moved = true;
    const dz = deadZone() ** 2;
    const from = (d.x - cueAt.x) ** 2 + (d.y - cueAt.y) ** 2;
    const to = (x - cueAt.x) ** 2 + (y - cueAt.y) ** 2;
    if (from > dz && to > dz) {
      let turn = Math.atan2(y - cueAt.y, x - cueAt.x) - Math.atan2(d.y - cueAt.y, d.x - cueAt.x);
      if (turn > Math.PI) turn -= 2 * Math.PI;
      else if (turn < -Math.PI) turn += 2 * Math.PI;
      rotate(turn);
    }
    d.x = x;
    d.y = y;
  }
  function onUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    drag.current = null;
    if (d?.mode === "aim" && !d.moved && e.type === "pointerup" && canShoot && !animating) {
      const [x, y] = point(e);
      aimAt(x, y);
    }
  }

  function rotate(a: number) {
    setAim(({ dx, dy }) => ({ dx: dx * Math.cos(a) - dy * Math.sin(a), dy: dx * Math.sin(a) + dy * Math.cos(a) }));
  }
  const nudge = (deg: number) => rotate((deg * Math.PI) / 180);
  const shoot = useCallback(() => {
    if (!canShoot || animating || !placeOk) return;
    onShoot({ dx: aim.dx, dy: aim.dy, power }, ballInHand ? { x: cueAt.x, y: cueAt.y } : undefined);
  }, [canShoot, animating, placeOk, onShoot, aim, power, ballInHand, cueAt.x, cueAt.y]);

  // Keyboard: ←/→ aim (Shift: faster), ↑/↓ power, Space/Enter shoots
  useEffect(() => {
    if (!canShoot) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" && (e.target as HTMLInputElement).type !== "range") return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        nudge((e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 3 : 0.4));
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setPower((p) => Math.max(0.05, Math.min(1, p + (e.key === "ArrowUp" ? 0.05 : -0.05))));
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canShoot, shoot]);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ width: view?.w, height: view?.h }}
        className={`mx-auto block touch-none select-none rounded-2xl ${canShoot && !animating ? "cursor-crosshair" : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label="Pool table"
      />
      {canShoot && !animating && (
        <div className="mx-auto mt-3 max-w-md space-y-2">
          {ballInHand && (
            <p className={`text-center text-xs font-semibold ${placeOk ? "text-emerald-300" : "text-red-300"}`}>
              {breakShot
                ? "Ball in hand behind the line — drag the cue ball, then aim"
                : kitchen
                  ? "They scratched on the break: ball in hand behind the line. A ball behind the line can't be hit until the cue ball has crossed it"
                  : "Ball in hand — drag the cue ball anywhere, then aim"}
              {!placeOk && " (it can't go there)"}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => nudge(-0.4)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 text-white" aria-label="Aim a little left">
              ◀
            </button>
            <label className="flex flex-1 items-center gap-2 text-xs text-neutral-300">
              Power
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(power * 100)}
                onChange={(e) => setPower(Number(e.target.value) / 100)}
                className="h-11 flex-1 accent-[#bf00ff]"
                aria-label="Shot power"
              />
              <span className="w-9 text-right tabular-nums text-white">{Math.round(power * 100)}%</span>
            </label>
            <button type="button" onClick={() => nudge(0.4)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 text-white" aria-label="Aim a little right">
              ▶
            </button>
          </div>
          <button type="button" onClick={shoot} disabled={!placeOk} className="btn-accent min-h-[52px] w-full justify-center text-base disabled:opacity-50">
            🎱 Shoot
          </button>
          <p className="text-center text-[11px] text-neutral-500">
            Tap where to send the cue ball · drag anywhere to turn the cue · ◀ ▶ for fine aim · keyboard: arrows + Space
          </p>
        </div>
      )}
    </div>
  );
}
