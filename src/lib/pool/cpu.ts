import { W, H, R, POCKETS, HEAD_X, FOOT, simulate, judge, canPlaceCue, freeCueSpot, groupOf, ballsLeft, type BallState, type Frame, type Shot } from "./engine";

/*
 * The computer opponent for DMY Pool practice (played in the browser — nothing is saved
 * or ranked). It looks at the shots a player would — each ball it may hit into each
 * pocket at a few speeds, plus plain hits for when nothing's on — plays every one out
 * with the real engine and rules, and takes the best. Then its aim wobbles by its
 * level, so it misses like a person.
 */

export type CpuLevel = "easy" | "normal" | "hard";
const WOBBLE_DEG: Record<CpuLevel, number> = { easy: 3.5, normal: 1.5, hard: 0.5 };
const POWERS = [0.3, 0.5, 0.75];
const HAND_POWERS = [0.4, 0.65]; // with ball in hand it sets up a straight shot

export interface CpuMove {
  shot: Shot;
  cue?: { x: number; y: number }; // where it puts the cue ball (ball in hand)
}
interface Option extends CpuMove {
  table: Frame; // the frame as the shot is taken (cue ball placed)
}

const unit = (x: number, y: number): [number, number] => {
  const l = Math.sqrt(x * x + y * y) || 1;
  return [x / l, y / l];
};
const turn = (s: Shot, deg: number): Shot => {
  const a = (deg * Math.PI) / 180;
  return { dx: s.dx * Math.cos(a) - s.dy * Math.sin(a), dy: s.dx * Math.sin(a) + s.dy * Math.cos(a), power: s.power };
};
/** Roughly bell-shaped, mostly within ±1. */
const wobble = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

/** The balls it may hit first. */
function legalTargets(f: Frame): BallState[] {
  const live = f.balls.filter((b) => b.id !== 0 && !b.potted);
  const g = f.groups[f.turn];
  if (g === null) return live.filter((b) => b.id !== 8);
  if (ballsLeft(f, f.turn) === 0) return live.filter((b) => b.id === 8);
  return live.filter((b) => groupOf(b.id) === g);
}

/** Nothing in the way of a ball rolling from a to b, apart from the balls in `skip`. */
function clear(balls: BallState[], ax: number, ay: number, bx: number, by: number, skip: number[]) {
  const [ux, uy] = unit(bx - ax, by - ay);
  const len = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  for (const o of balls) {
    if (o.potted || skip.includes(o.id)) continue;
    const t = (o.x - ax) * ux + (o.y - ay) * uy;
    if (t <= 0 || t >= len) continue;
    if ((o.x - ax) ** 2 + (o.y - ay) ** 2 - t * t < 4 * R * R) return false;
  }
  return true;
}

/** Where the cue ball has to be when it meets `b` to send it into pocket `p`. */
function ghost(b: BallState, p: { x: number; y: number }) {
  const [ux, uy] = unit(p.x - b.x, p.y - b.y);
  return { x: b.x - ux * 2 * R, y: b.y - uy * 2 * R, ux, uy };
}

const withCue = (f: Frame, cue: { x: number; y: number }): Frame => ({
  ...f,
  balls: f.balls.map((b) => (b.id === 0 ? { ...b, x: cue.x, y: cue.y, potted: false } : b)),
});

/** How good a shot is for the shooter: winning > potting and carrying on > a legal miss > a foul > losing the frame. */
function value(f: Frame, shot: Shot): number {
  const { outcome } = judge(f, simulate(f.balls, shot));
  if (outcome.frameWinner !== null) return outcome.frameWinner === f.turn ? 1000 : -1000;
  if (outcome.foul) return -100;
  if (outcome.keepsTurn) return 100 + 10 * outcome.potted.length;
  return 0;
}

/** Shots from where the cue ball is: pots that aren't blocked or too thin, and plain hits. */
function shotsFrom(f: Frame, targets: BallState[], pots = true): Option[] {
  const cue = f.balls.find((b) => b.id === 0)!;
  const out: Option[] = [];
  for (const b of targets) {
    for (const p of pots ? POCKETS : []) {
      const g = ghost(b, p);
      const [ax, ay] = unit(g.x - cue.x, g.y - cue.y);
      if (ax * g.ux + ay * g.uy < 0.3) continue; // too thin a cut
      if (!clear(f.balls, cue.x, cue.y, g.x, g.y, [0, b.id]) || !clear(f.balls, b.x, b.y, p.x, p.y, [0, b.id])) continue;
      for (const power of POWERS) out.push({ shot: { dx: ax, dy: ay, power }, table: f });
    }
    const [hx, hy] = unit(b.x - cue.x, b.y - cue.y);
    out.push({ shot: { dx: hx, dy: hy, power: 0.55 }, table: f });
  }
  return out;
}

/** Ball in hand: set up a straight shot behind each ball it may pot (from behind the head line, if it has to be there). */
function shotsInHand(f: Frame, targets: BallState[]): Option[] {
  const behind = f.breakShot || f.kitchen === true;
  const backs = behind ? [110, 260, 420] : [110]; // further back to reach behind the line
  const out: Option[] = [];
  for (const b of targets) {
    for (const p of POCKETS) {
      const g = ghost(b, p);
      for (const back of backs) {
        const cue = { x: g.x - g.ux * back, y: g.y - g.uy * back };
        if (!canPlaceCue(f.balls, cue.x, cue.y, behind)) continue;
        if (!clear(f.balls, cue.x, cue.y, g.x, g.y, [0, b.id]) || !clear(f.balls, b.x, b.y, p.x, p.y, [0, b.id])) continue;
        const table = withCue(f, cue);
        for (const power of HAND_POWERS) out.push({ cue, shot: { dx: g.ux, dy: g.uy, power }, table });
        break;
      }
    }
  }
  if (!out.length) {
    // Nothing to set up: any free spot, and a plain hit from there
    for (let x = 60; x < W && out.length < 6; x += 90) {
      for (let y = 60; y < H && out.length < 6; y += 95) {
        if (!canPlaceCue(f.balls, x, y, behind)) continue;
        const table = withCue(f, { x, y });
        out.push(...shotsFrom(table, targets, false).map((o) => ({ ...o, cue: { x, y } })));
      }
    }
  }
  return out;
}

/** The computer's shot (and where it puts the cue ball, with ball in hand). */
export function cpuMove(f: Frame, level: CpuLevel): CpuMove {
  const w = WOBBLE_DEG[level];
  if (f.breakShot) {
    const want = { x: HEAD_X * 0.75, y: H / 2 + (Math.random() - 0.5) * 100 };
    const cue = !f.ballInHand ? f.balls.find((b) => b.id === 0)! : canPlaceCue(f.balls, want.x, want.y, true) ? want : freeCueSpot(f.balls, true);
    return { cue: f.ballInHand ? { x: cue.x, y: cue.y } : undefined, shot: turn({ dx: FOOT.x - cue.x, dy: FOOT.y - cue.y, power: 0.95 }, wobble() * 0.6) };
  }

  const targets = legalTargets(f);
  const options = f.ballInHand ? shotsInHand(f, targets) : shotsFrom(f, targets);
  if (!options.length) {
    const cue = f.ballInHand ? freeCueSpot(f.balls, f.kitchen === true) : f.balls.find((b) => b.id === 0)!;
    return { shot: { dx: W / 2 - cue.x, dy: 1, power: 0.5 }, cue: f.ballInHand ? { x: cue.x, y: cue.y } : undefined };
  }

  const scored = options.map((o) => ({ o, v: value(o.table, o.shot) })).sort((a, b) => b.v - a.v);
  let pick: Option;
  if (level === "easy") {
    // Any of its few best ideas, not always the best one
    pick = scored[Math.floor(Math.random() * Math.min(3, scored.length))].o;
  } else {
    // Of the best few, the one that still works when the aim is a little off
    const top = scored.slice(0, 4).map(({ o, v }) => ({ o, v: v + value(o.table, turn(o.shot, w)) + value(o.table, turn(o.shot, -w)) }));
    pick = top.sort((a, b) => b.v - a.v)[0].o;
  }
  const aimed = turn(pick.shot, wobble() * w);
  return { cue: pick.cue, shot: { ...aimed, power: Math.min(1, Math.max(0.1, pick.shot.power * (1 + wobble() * 0.08))) } };
}
