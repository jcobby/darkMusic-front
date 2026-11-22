"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { W, H, R, POCKETS, HEAD_X, STEP, simulate, canPlaceCue, freeCueSpot, groupOf, type BallState, type Group, type Shot } from "@/lib/pool/engine";
import { CUES } from "@/lib/pool/cues";
import { drawBall3D, drawShadow, initialOrientation, orthonormalize, rotate as turnBall, screenMatrix, type Mat3 } from "@/lib/pool/render";
import { playSfx, resetSfx, unlockSfx, type SfxKind } from "@/lib/pool/sfx";
import { MiniBall } from "./PoolStage";
import { bassLevel, newFreqBuffer, useSoundtrack } from "../Soundtrack";
import type { CueDesign } from "@/lib/api";

/*
 * The DMY Pool table: draws the balls, lets the shooter aim (tap or drag on the table, the
 * fine-aim wheel for the last touch), place the cue ball with ball in hand, pick where the
 * tip hits the cue ball (spin) and pull back the power bar to shoot — and animates shots,
 * its own and the opponent's, with the same engine the server uses.
 *
 * It fits the box it's given, whole: standing up the screen with the controls underneath on a
 * tall screen (a phone held upright — the main way to play), lying down with the controls
 * either side on a wide one. The controls never sit on the table.
 */

const RAIL = 34; // cushion width around the cloth (logical units)
const TW = W + 2 * RAIL;
const TH = H + 2 * RAIL;
const FPS = 120; // a shot is recorded at 120 frames a second and blended between them, so it's smooth on any screen
const STEPS_PER_FRAME = Math.round(1 / STEP / FPS);
const DROP_FRAMES = Math.round(0.2 * FPS); // a potted ball takes this long to sink into the pocket
const STRIKE_MS = 90; // the cue's push through the ball before the shot goes
const MAX_DPR = 2; // sharper than this costs a phone more than it shows
const dprNow = () => Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, MAX_DPR);
const BELOW_H = 112; // the two rows of controls under an upright table (px)
const SIDE_L = 64; // the power bar beside a lying-down table
const SIDE_R = 84; // spin and the fine-aim wheel on the other side
const GAP = 8;
const CHUTE = 22 + 6; // the potted-balls chute beside an upright table, and its gap
const MIN_PULL = 0.03; // let go of the power bar below this and nothing happens

export type Spin = { x: number; y: number };
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
  controls: "below" | "sides" | "none";
}

/** The biggest table that fits the box, with room for the controls. */
function fitTable(bw: number, bh: number, controls: boolean): View {
  if (bh > bw) {
    const ah = Math.max(140, bh - (controls ? BELOW_H + GAP : 0));
    const s = Math.min((bw - (controls ? CHUTE : 0)) / TH, ah / TW);
    return { s, portrait: true, w: TH * s, h: TW * s, controls: controls ? "below" : "none" };
  }
  const aw = Math.max(200, bw - (controls ? SIDE_L + SIDE_R + 2 * GAP : 0));
  const s = Math.min(aw / TW, bh / TH);
  return { s, portrait: false, w: TW * s, h: TH * s, controls: controls ? "sides" : "none" };
}

/** Logical table point → canvas pixel (portrait: the head of the table at the bottom). */
function toScreen(v: View, x: number, y: number): [number, number] {
  return v.portrait ? [(y + RAIL) * v.s, (W + RAIL - x) * v.s] : [(x + RAIL) * v.s, (y + RAIL) * v.s];
}
function fromScreen(v: View, sx: number, sy: number): [number, number] {
  return v.portrait ? [W + RAIL - sy / v.s, sx / v.s - RAIL] : [sx / v.s - RAIL, sy / v.s - RAIL];
}

/** Where the aim line meets its first ball (the ghost ball) or the cushion. */
function aimPreview(balls: readonly BallState[], cx: number, cy: number, dx: number, dy: number) {
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
  if (!hit || wall < best) return { gx: cx + ux * wall, gy: cy + uy * wall, ux, uy, hit: null as BallState | null };
  return { gx: cx + ux * best, gy: cy + uy * best, ux, uy, hit };
}

/** A small four-point star (the rail sights). */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const d = i % 2 === 0 ? r : r * 0.38;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
}
/** A little flower (the other rail sights). */
function flower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

/*
 * The DMY table: a lacquered magenta frame with a patterned band and gold trim, pink-rimmed
 * pockets, and bright purple cloth with the 8-ball crest and the DMY mark worked into it.
 */
function drawTable(ctx: CanvasRenderingContext2D, v: View) {
  ctx.clearRect(0, 0, v.w, v.h);
  const s = v.s;
  const [x0, y0] = toScreen(v, 0, 0);
  const [x1, y1] = toScreen(v, W, H);
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  const cw = Math.abs(x1 - x0);
  const ch = Math.abs(y1 - y0);
  const rail = RAIL * s;

  // The frame
  const body = ctx.createLinearGradient(0, 0, v.w, v.h);
  body.addColorStop(0, "#8a1f9c");
  body.addColorStop(0.5, "#56106e");
  body.addColorStop(1, "#8a1f9c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(0, 0, v.w, v.h, 22 * s);
  ctx.fill();

  // Its patterned band: triangles in teal, gold and pink along every rail
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, v.w, v.h, 22 * s);
  ctx.rect(left - 10 * s, top - 10 * s, cw + 20 * s, ch + 20 * s);
  ctx.clip("evenodd");
  const tri = ["rgba(34,211,238,0.55)", "rgba(250,204,21,0.6)", "rgba(255,79,184,0.55)"];
  const step = Math.max(10, 26 * s);
  const deep = rail * 0.5;
  let k = 0;
  for (let x = 0; x < v.w; x += step, k++) {
    ctx.fillStyle = tri[k % 3];
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + step, 0);
    ctx.lineTo(x + step / 2, deep);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, v.h);
    ctx.lineTo(x + step, v.h);
    ctx.lineTo(x + step / 2, v.h - deep);
    ctx.fill();
  }
  k = 0;
  for (let y = 0; y < v.h; y += step, k++) {
    ctx.fillStyle = tri[(k + 1) % 3];
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(0, y + step);
    ctx.lineTo(deep, y + step / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(v.w, y);
    ctx.lineTo(v.w, y + step);
    ctx.lineTo(v.w - deep, y + step / 2);
    ctx.fill();
  }
  ctx.restore();

  // Pink lacquer edge, and the gold trim round the inside of the frame
  ctx.strokeStyle = "#ff4fb8";
  ctx.lineWidth = Math.max(2, 3 * s);
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, v.w - 3, v.h - 3, 21 * s);
  ctx.stroke();
  ctx.strokeStyle = "rgba(250,204,21,0.85)";
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.strokeRect(left - 11 * s, top - 11 * s, cw + 22 * s, ch + 22 * s);

  // The cushions: a band of brighter cloth round the bed
  const cush = 10 * s;
  ctx.fillStyle = "#7c34cf";
  ctx.fillRect(left - cush, top - cush, cw + 2 * cush, ch + 2 * cush);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; // the cushion's nose casting onto the bed
  ctx.fillRect(left, top, cw, 3 * s);
  ctx.fillRect(left, top, 3 * s, ch);

  // The bed: lit in the middle
  const g = ctx.createRadialGradient(left + cw / 2, top + ch / 2, 10, left + cw / 2, top + ch / 2, Math.max(cw, ch) * 0.62);
  g.addColorStop(0, "#9348ea");
  g.addColorStop(0.55, "#7330cf");
  g.addColorStop(1, "#4e179a");
  ctx.fillStyle = g;
  ctx.fillRect(left, top, cw, ch);

  // Worked into the cloth: the 8-ball crest and the DMY mark
  ctx.save();
  ctx.fillStyle = "rgba(40,6,82,0.17)";
  ctx.strokeStyle = "rgba(40,6,82,0.17)";
  const [ex, ey] = toScreen(v, W * 0.38, H / 2);
  const er = H * 0.17 * s;
  ctx.lineWidth = Math.max(1.5, 4 * s);
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(147,72,234,0.35)";
  ctx.beginPath();
  ctx.arc(ex - er * 0.12, ey - er * 0.1, er * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(40,6,82,0.2)";
  ctx.font = `900 ${Math.round(er * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("8", ex - er * 0.12, ey - er * 0.06);
  // laurels and three stars over it
  ctx.beginPath();
  ctx.arc(ex, ey, er * 1.28, Math.PI * 0.62, Math.PI * 1.18);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ex, ey, er * 1.28, -Math.PI * 0.18, Math.PI * 0.38);
  ctx.stroke();
  for (const d of [-1, 0, 1]) star(ctx, ex + d * er * 0.55, ey - er * 1.55 + Math.abs(d) * er * 0.18, er * 0.2);
  const [mx, my] = toScreen(v, W * 0.66, H / 2);
  ctx.font = `900 ${Math.round(78 * s)}px system-ui, sans-serif`;
  ctx.fillText("DMY", mx, my - 8 * s);
  ctx.font = `800 ${Math.round(17 * s)}px system-ui, sans-serif`;
  ctx.fillText("LENKO ARMY", mx, my + 40 * s);
  ctx.restore();

  // Head line
  const [hx0, hy0] = toScreen(v, HEAD_X, 0);
  const [hx1, hy1] = toScreen(v, HEAD_X, H);
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(hx0, hy0);
  ctx.lineTo(hx1, hy1);
  ctx.stroke();

  // Sights on the rails: gold stars and pink flowers
  const spots: [number, number][] = [
    ...[1, 2, 3, 5, 6, 7].flatMap((k): [number, number][] => [
      [(W * k) / 8, -RAIL * 0.62],
      [(W * k) / 8, H + RAIL * 0.62],
    ]),
    ...[1, 2, 3].flatMap((k): [number, number][] => [
      [-RAIL * 0.62, (H * k) / 4],
      [W + RAIL * 0.62, (H * k) / 4],
    ]),
  ];
  const sr = Math.max(3, 6.5 * s);
  spots.forEach(([x, y], i) => {
    const [sx, sy] = toScreen(v, x, y);
    if (i % 2 === 0) {
      ctx.fillStyle = "#fde68a";
      star(ctx, sx, sy, sr);
    } else {
      ctx.fillStyle = "#ff8fd0";
      flower(ctx, sx, sy, sr);
    }
  });

  // Pockets: a pink-gold metal rim, then the drop
  for (const p of POCKETS) {
    const [px, py] = toScreen(v, p.x, p.y);
    const pr = p.r * 0.95 * s;
    const rim = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.2, px, py, pr * 1.4);
    rim.addColorStop(0, "#ffd1ec");
    rim.addColorStop(0.55, "#ff4fb8");
    rim.addColorStop(1, "#8a0f5c");
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#16061f";
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.08, 0, Math.PI * 2);
    ctx.fill();
    const hole = ctx.createRadialGradient(px, py, 0, px, py, pr);
    hole.addColorStop(0, "#000");
    hole.addColorStop(0.8, "#050208");
    hole.addColorStop(1, "#1d0b26");
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A ball as drawn: where, which way it faces, and — sinking into a pocket — how far in. */
interface SceneBall {
  id: number;
  x: number;
  y: number;
  potted: boolean;
  rot: Mat3;
  drop?: { k: number; px: number; py: number }; // 0 → 1 on its way into the pocket at (px, py)
}

/** A shot played out ahead of time, ready to animate: frames at FPS, its sounds and its pots. */
interface Recording {
  ids: number[];
  pos: Float32Array[]; // per frame: x, y, potted (1/0) for each ball
  rot: Float64Array[]; // per frame: each ball's orientation (9 numbers)
  pottedAt: Map<number, { frame: number; px: number; py: number }>;
  sounds: { t: number; kind: SfxKind; v: number; id?: number }[]; // t: seconds in; id: the ball that dropped
  end: Mat3[]; // each ball's orientation when it all stops
}

type Moving = BallState & { vx: number; vy: number; wx: number; wy: number; s: number };

function nearestPocket(x: number, y: number) {
  let best = POCKETS[0];
  let bd = Infinity;
  for (const p of POCKETS) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/**
 * Play the shot out with the engine (the same one the server uses) and keep what the
 * animation needs: positions at FPS, how each ball turns (from its real roll and side spin —
 * draw and follow show), when balls click, thud into cushions and drop, and where they drop.
 */
function record(start: BallState[], shot: Shot, orient: (id: number) => Mat3): Recording {
  const ids = start.map((b) => b.id);
  const n = ids.length;
  const rots = ids.map((id) => new Float64Array(orient(id)));
  const pos: Float32Array[] = [];
  const rot: Float64Array[] = [];
  const pottedAt: Recording["pottedAt"] = new Map();
  const sounds: Recording["sounds"] = [{ t: 0, kind: "cue", v: shot.power }];
  const pv = new Float64Array(n * 2); // each ball's speed a step ago
  const was = start.map((b) => b.potted);
  let primed = false;
  const snap = (list: readonly BallState[]) => {
    const p = new Float32Array(n * 3);
    const r = new Float64Array(n * 9);
    for (let i = 0; i < n; i++) {
      p[i * 3] = list[i].x;
      p[i * 3 + 1] = list[i].y;
      p[i * 3 + 2] = list[i].potted ? 1 : 0;
      r.set(rots[i], i * 9);
    }
    pos.push(p);
    rot.push(r);
  };
  snap(start);
  const result = simulate(start, shot, (list, step) => {
    const t = (step + 1) * STEP;
    let click = 0;
    let thump = 0;
    for (let i = 0; i < n; i++) {
      const b = list[i] as Moving;
      if (b.potted) {
        if (!was[i]) {
          was[i] = true;
          const pk = nearestPocket(b.x, b.y);
          pottedAt.set(b.id, { frame: pos.length, px: pk.x, py: pk.y });
          sounds.push({ t, kind: "pocket", v: Math.min(1, 0.35 + Math.hypot(pv[i * 2], pv[i * 2 + 1]) / 1600), id: b.id });
        }
        continue;
      }
      // Rolling turns it about the line across its path; side spin about the vertical
      turnBall(rots[i], -b.wy / R, b.wx / R, b.s / R, STEP);
      if (primed) {
        const dv = Math.hypot(b.vx - pv[i * 2], b.vy - pv[i * 2 + 1]);
        if (dv > 60) {
          const wall = b.x <= R + 0.01 || b.x >= W - R - 0.01 || b.y <= R + 0.01 || b.y >= H - R - 0.01;
          if (wall) thump = Math.max(thump, dv);
          else click = Math.max(click, dv);
        }
      }
      pv[i * 2] = b.vx;
      pv[i * 2 + 1] = b.vy;
    }
    primed = true;
    if (click) sounds.push({ t, kind: "ball", v: Math.min(1, click / 1800) });
    if (thump) sounds.push({ t, kind: "cushion", v: Math.min(1, thump / 2200) });
    if (step % 60 === 59) for (const m of rots) orthonormalize(m);
    if ((step + 1) % STEPS_PER_FRAME === 0) snap(list);
  });
  for (const m of rots) orthonormalize(m);
  snap(result.balls);
  // Hold the last frame until the last ball has finished sinking
  let last = 0;
  for (const p of pottedAt.values()) last = Math.max(last, p.frame);
  while (pottedAt.size && pos.length < last + DROP_FRAMES + 1) {
    pos.push(pos[pos.length - 1]);
    rot.push(rot[rot.length - 1]);
  }
  return { ids, pos, rot, pottedAt, sounds, end: rots };
}

/** The table at frame `f` (fractional: blended between the two recorded frames either side). */
function sceneAt(rec: Recording, f: number): SceneBall[] {
  const last = rec.pos.length - 1;
  const i = Math.max(0, Math.min(last, Math.floor(f)));
  const j = Math.min(last, i + 1);
  const a = Math.max(0, Math.min(1, f - i));
  const P = rec.pos[i];
  const Q = rec.pos[j];
  const Ro = rec.rot[i];
  return rec.ids.map((id, k) => {
    const rot = Ro.subarray(k * 9, k * 9 + 9);
    if (P[k * 3 + 2] === 1) {
      const pa = rec.pottedAt.get(id);
      const dk = pa ? (f - pa.frame) / DROP_FRAMES : 1;
      if (pa && dk < 1) return { id, x: P[k * 3], y: P[k * 3 + 1], potted: false, rot, drop: { k: Math.max(0, dk), px: pa.px, py: pa.py } };
      return { id, x: P[k * 3], y: P[k * 3 + 1], potted: true, rot };
    }
    const q = Q[k * 3 + 2] === 1 ? 0 : a; // about to drop: it doesn't slide into the pocket's middle
    return { id, x: P[k * 3] + (Q[k * 3] - P[k * 3]) * q, y: P[k * 3 + 1] + (Q[k * 3 + 1] - P[k * 3 + 1]) * q, potted: false, rot };
  });
}

/** Where a ball is drawn and how big: a sinking ball slides to the pocket's middle, shrinking and fading. */
function placeOf(v: View, b: SceneBall) {
  let { x, y } = b;
  let scale = 1;
  let alpha = 1;
  if (b.drop) {
    const k = b.drop.k;
    x += (b.drop.px - x) * k;
    y += (b.drop.py - y) * k;
    scale = 1 - 0.5 * k;
    alpha = 1 - 0.7 * k;
  }
  const [sx, sy] = toScreen(v, x, y);
  return { sx, sy, r: R * v.s * scale, alpha };
}

const screenRot = new Float64Array(9);

/** The static table, drawn once per size into its own canvas (redrawing its gradients every frame was the slow part). */
function tableImage(v: View, dpr: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(v.w * dpr);
  c.height = Math.round(v.h * dpr);
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTable(ctx, v);
  }
  return c;
}

/** What the shooter needs to know about this shot (ball in hand, two shots), or null. */
function shotNote(o: { ballInHand: boolean; breakShot: boolean; kitchen: boolean; twoShots: boolean; placeOk: boolean }): string | null {
  const parts: string[] = [];
  if (o.twoShots) parts.push("✌️ Two shots — miss with this one and you shoot again");
  if (o.ballInHand) {
    parts.push(
      (o.breakShot
        ? "Ball in hand behind the line — drag the cue ball, then aim"
        : o.kitchen
          ? "Ball in hand behind the line — a ball behind it can't be hit until the cue ball crosses it"
          : "Ball in hand — drag the cue ball anywhere, then aim") + (o.placeOk ? "" : " (it can't go there)")
    );
  }
  return parts.length ? parts.join(" · ") : null;
}

export function PoolTable({
  balls,
  playback,
  onPlayed,
  canShoot,
  ballInHand,
  breakShot,
  kitchen = false,
  twoShots = false,
  target,
  onShoot,
  cueDesign = "classic",
  fill = false,
  waiting = null,
  onNote,
  onPot,
  songTitle,
}: {
  balls: BallState[]; // the table at rest
  playback: Playback | null; // a shot to animate first
  onPlayed: () => void;
  canShoot: boolean;
  ballInHand: boolean;
  breakShot: boolean;
  kitchen?: boolean; // ball in hand behind the head line after the cue ball went in
  twoShots?: boolean; // the other player fouled: a miss with this shot doesn't end the turn
  target: Group | "eight" | null; // the shooter's balls (highlighted)
  onShoot: (shot: Shot, cue?: { x: number; y: number }) => void;
  cueDesign?: CueDesign; // the player's cue (VIPs and Legends have the exclusive ones)
  fill?: boolean; // fill the parent's box (the full-screen game) — otherwise the page width, within the screen's height
  waiting?: string | null; // shown on the controls while it's not your shot (e.g. "Kwame B.'s shot")
  onNote?: (note: string | null) => void; // where to show "ball in hand" / "two shots" (else shown above the table)
  onPot?: (id: number) => void; // a ball just dropped (as it drops in the animation) — DMY Pool's jukebox plays its song
  songTitle?: (id: number) => string | null; // a ball's song, for the potted-balls chute
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [aim, setAim] = useState({ dx: 1, dy: 0 });
  const [power, setPower] = useState(0.55); // the keyboard's power (↑/↓)
  const [pull, setPull] = useState<number | null>(null); // the power bar while it's being pulled
  const [spin, setSpin] = useState<Spin>({ x: 0, y: 0 });
  const [picking, setPicking] = useState(false);
  const [cue, setCue] = useState<{ x: number; y: number } | null>(null);
  const [animating, setAnimating] = useState(false);
  const [striking, setStriking] = useState(false); // the cue's push through the ball
  const orient = useRef(new Map<number, Mat3>()); // which way each ball faces (kept from shot to shot)
  const orientOf = useCallback((id: number) => {
    let m = orient.current.get(id);
    if (!m) orient.current.set(id, (m = initialOrientation()));
    return m;
  }, []);
  const cache = useRef<{ view: View; dpr: number; img: HTMLCanvasElement } | null>(null);
  const cueHeardAt = useRef(0); // our own strike already made the cue's sound
  const onPotRef = useRef(onPot);
  onPotRef.current = onPot;
  const drag = useRef<{ mode: "cue" | "aim"; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null);
  const shownKey = useRef<number | null>(null);
  const withControls = fill;

  // Fit the box (resized with the window and the phone's turning). Tiny height changes — a
  // phone's browser bar sliding in and out — are ignored.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let last = { w: 0, h: 0 };
    const fit = () => {
      const w = el.clientWidth;
      const h = fill ? el.clientHeight : Math.max(320, window.innerHeight - 150);
      if (w === last.w && Math.abs(h - last.h) < 24) return;
      last = { w, h };
      if (w > 0 && h > 0) setView(fitTable(w, h, withControls));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [fill, withControls]);

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
  const ready = canShoot && !animating;

  // "Ball in hand" / "two shots" for the page (or above the table)
  const note = ready ? shotNote({ ballInHand, breakShot, kitchen, twoShots, placeOk }) : null;
  useEffect(() => onNote?.(note), [note, onNote]);

  const paint = useCallback(
    (list: readonly SceneBall[], overlay: boolean) => {
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx || !view) return;
      const dpr = dprNow();
      // The table itself comes from its own canvas, drawn once per size
      if (!cache.current || cache.current.view !== view || cache.current.dpr !== dpr) cache.current = { view, dpr, img: tableImage(view, dpr) };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(cache.current.img, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (overlay) {
        // Aim line, ghost ball, where the object ball goes and where the cue ball goes after it
        const p = aimPreview(list, cueAt.x, cueAt.y, aim.dx, aim.dy);
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
          const full = (p.ux * ox + p.uy * oy) / ol; // 1 = straight on, 0 = the thinnest touch
          // The object ball's line: longer the fuller the hit
          const [hx, hy] = toScreen(view, p.hit.x, p.hit.y);
          const [ex, ey] = toScreen(view, p.hit.x + (ox / ol) * (30 + 90 * full), p.hit.y + (oy / ol) * (30 + 90 * full));
          ctx.strokeStyle = "rgba(250,204,21,0.9)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          // The cue ball's line off the hit (the tangent) — before any spin bends it
          const tx = p.ux - full * (ox / ol);
          const ty = p.uy - full * (oy / ol);
          const tl = Math.sqrt(tx * tx + ty * ty);
          if (tl > 0.05) {
            const [kx, ky] = toScreen(view, p.gx + (tx / tl) * 70 * tl, p.gy + (ty / tl) * 70 * tl);
            ctx.strokeStyle = "rgba(255,255,255,0.6)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(kx, ky);
            ctx.stroke();
          }
        }
      }
      // Shadows first, so no ball's shadow falls across another ball
      for (const b of list) {
        if (b.potted || b.drop) continue;
        const { sx, sy, r } = placeOf(view, b);
        drawShadow(ctx, dpr, sx, sy, r);
      }
      for (const b of list) {
        if (b.potted) continue;
        const isCue = b.id === 0;
        const mine = target === "eight" ? b.id === 8 : target ? groupOf(b.id) === target : false;
        const { sx, sy, r, alpha } = placeOf(view, b);
        if (overlay && mine) {
          ctx.strokeStyle = "rgba(250,204,21,0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawBall3D(ctx, dpr, b.id, sx, sy, r, screenMatrix(b.rot, view.portrait, screenRot), isCue && overlay && ballInHand && !placeOk ? 0.45 : alpha);
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
        // The cue stick, pulled back with the power bar — over the balls, like a real one. A tip off
        // centre (side spin) shows as the cue lined up a little to that side.
        const len = Math.sqrt(aim.dx * aim.dx + aim.dy * aim.dy) || 1;
        const ux = aim.dx / len;
        const uy = aim.dy / len;
        const off = spin.x * R * 0.5;
        const ox = -uy * off; // the shooter's right, on this table
        const oy = ux * off;
        const back = R * 1.5 + (pull ?? 0) * 110;
        const at = (d: number) => toScreen(view, cueAt.x + ox - ux * d, cueAt.y + oy - uy * d);
        const [s0x, s0y] = at(back);
        const [s1x, s1y] = at(back + 260);
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
        // A line of light along the top of it, so it reads as round
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = Math.max(1, 1.4 * view.s);
        ctx.beginPath();
        ctx.moveTo(s0x - 0.8, s0y - 1);
        ctx.lineTo(s1x - 0.8, s1y - 1);
        ctx.stroke();
        ctx.lineWidth = Math.max(3, 5 * view.s);
        const [tx, ty] = at(back + 9);
        ctx.strokeStyle = look.tip;
        ctx.beginPath();
        ctx.moveTo(s0x, s0y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.lineCap = "butt";
      }
    },
    [view, cueAt.x, cueAt.y, aim.dx, aim.dy, pull, spin.x, target, ballInHand, placeOk, cueDesign]
  );

  // Canvas size
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !view) return;
    const dpr = dprNow();
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
    const rec = record(playback.start, playback.shot, orientOf);
    rec.ids.forEach((id, k) => orient.current.set(id, rec.end[k])); // where they'll face when it stops
    // Our own strike already made the cue's sound
    let next = Date.now() - cueHeardAt.current < 4000 ? 1 : 0;
    cueHeardAt.current = 0;
    resetSfx();
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
    const last = rec.pos.length - 1;
    const tick = (t: number) => {
      // Real time, whatever the screen's refresh rate (a frame's time can be a touch before t0)
      const secs = Math.max(0, (t - t0) / 1000);
      const f = Math.min(last, secs * FPS);
      for (; next < rec.sounds.length && rec.sounds[next].t <= secs; next++) {
        const e = rec.sounds[next];
        playSfx(e.kind, e.v);
        if (e.id !== undefined && e.id !== 0) onPotRef.current?.(e.id);
      }
      paintRef.current(sceneAt(rec, f), false);
      if (f < last) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      finish();
    };
  }, [playback, sized, orientOf]);

  // The table at rest (with the aim when it's your shot)
  useEffect(() => {
    if (animating || (playback && shownKey.current !== playback.key)) return;
    paint((ready ? shown : balls).map((b) => ({ ...b, rot: orientOf(b.id) })), ready);
  }, [paint, shown, balls, ready, animating, playback, orientOf]);

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
    if (!ready || striking) return;
    const [x, y] = point(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const near = (x - cueAt.x) ** 2 + (y - cueAt.y) ** 2 < deadZone() ** 2;
    drag.current = { mode: ballInHand && near ? "cue" : "aim", x, y, sx: e.clientX, sy: e.clientY, moved: false };
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d || !ready) return;
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
    if (d?.mode === "aim" && !d.moved && e.type === "pointerup" && ready) {
      const [x, y] = point(e);
      aimAt(x, y);
    }
  }

  function rotate(a: number) {
    setAim(({ dx, dy }) => ({ dx: dx * Math.cos(a) - dy * Math.sin(a), dy: dx * Math.sin(a) + dy * Math.cos(a) }));
  }
  const nudge = useCallback((deg: number) => rotate((deg * Math.PI) / 180), []);
  // The cue pushes through the ball (a few frames), with the strike's sound — then the shot goes
  const strikeRaf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(strikeRaf.current), []);
  const shoot = useCallback(
    (p: number) => {
      if (!ready || !placeOk || striking || p < MIN_PULL) return;
      const power = Math.min(1, p);
      const sp = spin.x !== 0 || spin.y !== 0 ? { spin: { x: spin.x, y: spin.y } } : {};
      const shot: Shot = { dx: aim.dx, dy: aim.dy, power, ...sp };
      const at = ballInHand ? { x: cueAt.x, y: cueAt.y } : undefined;
      unlockSfx();
      setStriking(true);
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / STRIKE_MS);
        setPull(power * (1 - k * k) - 0.06 * k); // accelerating forward, the tip just into the ball
        if (k < 1) {
          strikeRaf.current = requestAnimationFrame(step);
          return;
        }
        setPull(null);
        setStriking(false);
        playSfx("cue", power);
        cueHeardAt.current = Date.now();
        onShoot(shot, at);
        setSpin({ x: 0, y: 0 }); // like the real game: back to a centre hit for the next shot
      };
      strikeRaf.current = requestAnimationFrame(step);
    },
    [ready, placeOk, striking, onShoot, aim, spin, ballInHand, cueAt.x, cueAt.y]
  );

  // Keyboard: ←/→ aim (Shift: faster), ↑/↓ power, W/A/S/D spin (C: centre), Space/Enter shoots
  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && (t as HTMLInputElement).type !== "range"))) return;
      const k = e.key.toLowerCase();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        nudge((e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 3 : 0.4));
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setPower((p) => Math.max(0.05, Math.min(1, p + (e.key === "ArrowUp" ? 0.05 : -0.05))));
      } else if (k === "w" || k === "s" || k === "a" || k === "d") {
        e.preventDefault();
        setSpin((s) => clampSpin({ x: s.x + (k === "d" ? 0.2 : k === "a" ? -0.2 : 0), y: s.y + (k === "w" ? 0.2 : k === "s" ? -0.2 : 0) }));
      } else if (k === "c") {
        setSpin({ x: 0, y: 0 });
      } else if (e.key === " " || e.key === "Enter") {
        if (t?.tagName === "BUTTON") return; // a focused button's own Enter/Space
        e.preventDefault();
        shoot(power);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, shoot, power, nudge]);

  // The table's neon glow pulses with the music's bass (only its opacity changes — cheap to draw)
  const soundtrack = useSoundtrack();
  const glowRef = useRef<HTMLDivElement | null>(null);
  const musicOn = Boolean(soundtrack?.playing && !soundtrack.muted);
  const analyser = soundtrack?.analyser;
  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    // The opacity is set by hand, so it's cleared by hand: when the layout changes, React can reuse
    // this node for something else (it once left the whole table at 12% on phones)
    if (!musicOn || !analyser) {
      el.style.opacity = "";
      return;
    }
    const buf = newFreqBuffer();
    let level = 0;
    let raf = 0;
    const tick = () => {
      const bass = bassLevel(analyser.current, buf);
      const target = Math.max(0, Math.min(1, (bass - 110) / 120));
      level = target > level ? level + (target - level) * 0.6 : level * 0.9; // quick to light, slow to fade
      el.style.opacity = (0.12 + 0.88 * level).toFixed(3);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.style.opacity = "";
    };
  }, [musicOn, analyser, view]);

  const canvas = (
    <div key="table" className="relative shrink-0" style={{ width: view?.w, height: view?.h }}>
      <div
        key="glow"
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-[22px] opacity-0"
        style={{ boxShadow: "0 0 28px 6px rgba(191,0,255,0.85), 0 0 60px 14px rgba(255,79,184,0.35)", willChange: "opacity" }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: view?.w, height: view?.h }}
        className={`relative block touch-none select-none rounded-2xl ${ready ? "cursor-crosshair" : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label="Pool table"
        data-cue={restCue && !restCue.potted ? `${Math.round(restCue.x)},${Math.round(restCue.y)}` : undefined}
      />
    </div>
  );
  const off = !ready;
  const label = off ? (animating ? "…" : (waiting ?? "Wait for your shot")) : null;
  const spinButton = <SpinButton spin={spin} disabled={off} onOpen={() => setPicking(true)} />;

  return (
    <div ref={wrapRef} className={fill ? "flex h-full w-full items-center justify-center" : "w-full"} onPointerDownCapture={unlockSfx}>
      {!fill && note && <p className="mb-2 text-center text-xs font-semibold text-yellow-200">{note}</p>}
      {view?.controls === "sides" ? (
        <div className="flex items-center" style={{ gap: GAP }}>
          <div style={{ width: SIDE_L, height: view.h }}>
            <PowerBar vertical value={pull} keyboard={power} disabled={off || !placeOk} label={label} onPull={setPull} onRelease={shoot} />
          </div>
          {canvas}
          <div className="flex flex-col items-center gap-3" style={{ width: SIDE_R, height: view.h }}>
            {spinButton}
            <div className="flex min-h-0 w-full flex-1 gap-1.5">
              <Chute balls={balls} songTitle={songTitle} />
              <FineAim vertical disabled={off} onTurn={nudge} />
            </div>
          </div>
        </div>
      ) : view?.controls === "below" ? (
        <div className="flex w-full flex-col items-center" style={{ gap: GAP }}>
          <div className="flex items-stretch gap-1.5">
            {canvas}
            <Chute balls={balls} songTitle={songTitle} />
          </div>
          <div className="w-full max-w-[460px] space-y-2 px-1" style={{ height: BELOW_H - 8 }}>
            <div className="flex h-12 items-center gap-2">
              {spinButton}
              <FineAim disabled={off} onTurn={nudge} />
            </div>
            <div className="h-12">
              <PowerBar value={pull} keyboard={power} disabled={off || !placeOk} label={label} onPull={setPull} onRelease={shoot} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center">{canvas}</div>
      )}
      {picking && <SpinPicker spin={spin} onChange={setSpin} onClose={() => setPicking(false)} />}
    </div>
  );
}

// ---------- Controls ----------

const clampSpin = (s: Spin): Spin => {
  const l = Math.sqrt(s.x * s.x + s.y * s.y);
  return l > 1 ? { x: s.x / l, y: s.y / l } : s;
};
const spinName = (s: Spin) => {
  const v = s.y > 0.15 ? "follow" : s.y < -0.15 ? "draw" : "";
  const h = s.x > 0.15 ? "right" : s.x < -0.15 ? "left" : "";
  return v || h ? [v && v[0].toUpperCase() + v.slice(1), h && (v ? h : h[0].toUpperCase() + h.slice(1))].filter(Boolean).join(" + ") + (h ? " side" : "") : "Centre";
};

/** The cue ball with a red dot where the tip will hit it. Opens the spin picker. */
function SpinButton({ spin, disabled, onOpen }: { spin: Spin; disabled: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-label={`Spin: ${spinName(spin)} — change where the cue hits the ball`}
      title="Spin"
      className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,#e9e9e9_55%,#bdbdbd)] shadow-[0_0_0_2px_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.5)] transition disabled:opacity-40"
    >
      <span aria-hidden className="absolute h-px w-8 bg-black/15" />
      <span aria-hidden className="absolute h-8 w-px bg-black/15" />
      <span
        aria-hidden
        className="absolute h-3 w-3 rounded-full bg-red-600 shadow-[0_0_0_2px_rgba(255,255,255,0.8)]"
        style={{ left: `calc(50% + ${spin.x * 15}px - 6px)`, top: `calc(50% - ${spin.y * 15}px - 6px)` }}
      />
    </button>
  );
}

/** A big cue ball: drag or tap to put the tip where you want it (like 8 Ball Pool's spin control). */
function SpinPicker({ spin, onChange, onClose }: { spin: Spin; onChange: (s: Spin) => void; onClose: () => void }) {
  const ball = useRef<HTMLDivElement | null>(null);
  const setFrom = (e: React.PointerEvent) => {
    const r = ball.current?.getBoundingClientRect();
    if (!r) return;
    const half = r.width / 2;
    const x = (e.clientX - (r.left + half)) / (half * 0.82);
    const y = -(e.clientY - (r.top + half)) / (half * 0.82);
    onChange(clampSpin({ x: Math.abs(x) < 0.06 ? 0 : x, y: Math.abs(y) < 0.06 ? 0 : y }));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const hint =
    spin.y < -0.15
      ? "Draw: the cue ball stops and comes back after the hit"
      : spin.y > 0.15
        ? "Follow: the cue ball rolls on after the hit"
        : Math.abs(spin.x) > 0.15
          ? "Side spin: it comes off cushions at a different angle"
          : "Centre: no spin — it stops close to where it hits (from close up)";
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Spin">
      <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-ink-800 p-5 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-white">Where the cue hits the ball</p>
        <div className="relative mx-auto mt-4 w-[min(15rem,70vw)]">
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Follow ↑</span>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Draw ↓</span>
          <span className="absolute -left-1 top-1/2 -translate-x-full -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Left</span>
          <span className="absolute -right-1 top-1/2 translate-x-full -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Right</span>
          <div
            ref={ball}
            role="slider"
            aria-label="Spin point (up: follow, down: draw)"
            aria-valuemin={-100}
            aria-valuemax={100}
            aria-valuenow={Math.round(spin.y * 100)}
            aria-valuetext={spinName(spin)}
            tabIndex={0}
            className="relative aspect-square w-full touch-none select-none rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,#ececec_50%,#b9b9b9)] shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setFrom(e);
            }}
            onPointerMove={(e) => e.buttons && setFrom(e)}
          >
            <span aria-hidden className="absolute left-1/2 top-[9%] h-[82%] w-px -translate-x-1/2 bg-black/15" />
            <span aria-hidden className="absolute left-[9%] top-1/2 h-px w-[82%] -translate-y-1/2 bg-black/15" />
            <span aria-hidden className="absolute left-1/2 top-1/2 h-[41%] w-[41%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-black/15" />
            <span
              aria-hidden
              className="absolute h-6 w-6 rounded-full bg-red-600 shadow-[0_0_0_3px_rgba(255,255,255,0.85),0_2px_6px_rgba(0,0,0,0.4)]"
              style={{ left: `calc(50% + ${spin.x * 41}% - 12px)`, top: `calc(50% - ${spin.y * 41}% - 12px)` }}
            />
          </div>
        </div>
        <p className="mt-7 min-h-[2.5rem] text-xs text-neutral-300">{hint}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => onChange({ x: 0, y: 0 })} className="btn-outline min-h-[44px] flex-1 justify-center text-sm">
            Centre
          </button>
          <button type="button" onClick={onClose} className="btn-accent min-h-[44px] flex-1 justify-center text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The power bar: press anywhere on it and pull — down (beside the table) or to the right
 * (under it) — then let go to shoot. Slide back to where you started to cancel.
 */
function PowerBar({
  vertical = false,
  value,
  keyboard,
  disabled,
  label,
  onPull,
  onRelease,
}: {
  vertical?: boolean;
  value: number | null; // the pull in progress
  keyboard: number; // the power Space shoots with (↑/↓)
  disabled: boolean;
  label: string | null;
  onPull: (p: number | null) => void;
  onRelease: (p: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const start = useRef<number | null>(null);
  const live = useRef(0);
  const read = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || start.current === null) return 0;
    const len = (vertical ? el.clientHeight : el.clientWidth) * 0.85;
    const d = (vertical ? e.clientY : e.clientX) - start.current;
    return Math.max(0, Math.min(1, d / len));
  };
  const p = value ?? 0;
  const pct = Math.round(p * 100);
  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Power — pull and let go to shoot"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? Math.round(keyboard * 100) : pct}
      aria-disabled={disabled}
      className={`relative h-full w-full touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]/80 shadow-inner ${disabled ? "opacity-40" : "cursor-grab active:cursor-grabbing"}`}
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = vertical ? e.clientY : e.clientX;
        live.current = 0;
        onPull(0);
      }}
      onPointerMove={(e) => {
        if (start.current === null) return;
        live.current = read(e);
        onPull(live.current);
      }}
      onPointerUp={() => {
        if (start.current === null) return;
        start.current = null;
        const shot = live.current;
        onPull(null);
        if (shot >= MIN_PULL) onRelease(shot);
      }}
      onPointerCancel={() => {
        start.current = null;
        onPull(null);
      }}
    >
      {/* The meter along its edge: green → yellow → red as it builds */}
      <div aria-hidden className={`absolute overflow-hidden rounded-full bg-white/10 ${vertical ? "bottom-2 left-1.5 top-2 w-1.5" : "bottom-1.5 left-2 right-2 h-1.5"}`}>
        <div
          className="absolute rounded-full"
          style={
            vertical
              ? { left: 0, right: 0, top: 0, height: `${p * 100}%`, backgroundImage: "linear-gradient(to bottom, #34d399, #facc15, #ef4444)" }
              : { top: 0, bottom: 0, left: 0, width: `${p * 100}%`, backgroundImage: "linear-gradient(to right, #34d399, #facc15, #ef4444)" }
          }
        />
      </div>
      {/* The cue itself, drawn back as you pull */}
      <div
        aria-hidden
        className="absolute"
        style={
          vertical
            ? { left: "50%", top: `calc(8px + ${p * 55}%)`, width: 8, height: "70%", marginLeft: -2, borderRadius: 4, background: "linear-gradient(to bottom, #f8fafc 0 3%, #2563eb 3% 5%, #f3e2c0 5% 45%, #b07a3c 45% 60%, #3b1d0b 60% 100%)", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }
            : { top: "50%", left: `calc(8px + ${p * 55}%)`, height: 8, width: "70%", marginTop: -6, borderRadius: 4, background: "linear-gradient(to left, #f8fafc 0 3%, #2563eb 3% 5%, #f3e2c0 5% 45%, #b07a3c 45% 60%, #3b1d0b 60% 100%)", transform: "scaleX(-1)", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }
        }
      />
      {/* Space's power, for keyboard players */}
      {value === null && !disabled && (
        <div aria-hidden className="absolute hidden bg-white/60 [@media(pointer:fine)]:block" style={vertical ? { left: 6, right: 6, top: `${keyboard * 100}%`, height: 2 } : { top: 6, bottom: 6, left: `${keyboard * 100}%`, width: 2 }} />
      )}
      <span
        className={`pointer-events-none absolute grid place-items-center px-1 text-center font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${vertical ? "inset-x-0 bottom-2 text-[10px] leading-tight" : "inset-y-0 right-3 text-xs"}`}
      >
        {label ? (vertical ? "WAIT" : label) : value === null ? (vertical ? "PULL ↓" : "PULL →") : value < MIN_PULL ? "cancel" : `${pct}%`}
      </span>
    </div>
  );
}

/** The fine-aim wheel: drag along it for the last fraction of a degree. */
function FineAim({ vertical = false, disabled, onTurn }: { vertical?: boolean; disabled: boolean; onTurn: (deg: number) => void }) {
  const last = useRef<number | null>(null);
  const [roll, setRoll] = useState(0);
  return (
    <div
      role="slider"
      aria-label="Fine aim — drag to turn the cue a little"
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-valuetext="drag to turn the cue"
      aria-disabled={disabled}
      className={`relative touch-none select-none overflow-hidden rounded-xl border border-white/10 bg-[#120a18] ${vertical ? "w-12 flex-1" : "h-12 flex-1"} ${disabled ? "opacity-40" : "cursor-ns-resize"}`}
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = vertical ? e.clientY : e.clientX;
      }}
      onPointerMove={(e) => {
        if (last.current === null) return;
        const now = vertical ? e.clientY : e.clientX;
        const d = now - last.current;
        last.current = now;
        if (d) {
          onTurn(d * 0.05);
          setRoll((r) => r + d);
        }
      }}
      onPointerUp={() => (last.current = null)}
      onPointerCancel={() => (last.current = null)}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: vertical
            ? "repeating-linear-gradient(to bottom, rgba(255,255,255,0.0) 0 5px, rgba(255,255,255,0.28) 5px 7px)"
            : "repeating-linear-gradient(to right, rgba(255,255,255,0.0) 0 5px, rgba(255,255,255,0.28) 5px 7px)",
          backgroundPosition: vertical ? `0 ${roll}px` : `${roll}px 0`,
          maskImage: vertical ? "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)" : "linear-gradient(to right, transparent, black 30%, black 70%, transparent)",
        }}
      />
      <span className={`pointer-events-none absolute inset-0 grid place-items-center text-[10px] font-semibold uppercase tracking-wider text-neutral-400 ${vertical ? "[writing-mode:vertical-rl]" : ""}`}>
        Fine aim
      </span>
    </div>
  );
}

/** The chute beside the table: the balls potted this frame, collected at the bottom (like 8 Ball Pool's). */
function Chute({ balls, songTitle }: { balls: BallState[]; songTitle?: (id: number) => string | null }) {
  const down = balls.filter((b) => b.potted && b.id !== 0);
  const label = (id: number) => {
    const song = songTitle?.(id);
    return song ? `${id} · ${song}` : String(id);
  };
  return (
    <div
      className="relative flex w-6 shrink-0 flex-col-reverse items-center gap-[2px] overflow-hidden rounded-full border border-white/25 bg-gradient-to-r from-[#0b1020] via-[#26314d] to-[#0b1020] py-1 shadow-[inset_0_0_6px_rgba(0,0,0,0.8)]"
      aria-label={`Potted: ${down.length ? down.map((b) => label(b.id)).join(", ") : "none yet"}`}
      data-chute
    >
      {down.map((b) => (
        <span key={b.id} title={label(b.id)}>
          <MiniBall id={b.id} size={18} />
        </span>
      ))}
    </div>
  );
}
