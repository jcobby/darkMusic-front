"use client";

import { useCallback, useRef, useState } from "react";
import { R, W, H, simulate, type BallState, type Shot } from "@/lib/pool/engine";
import { PoolTable, type Playback } from "./PoolTable";
import { PoolStage, StageButton, StageMenu } from "./PoolStage";
import { useFanAuth } from "../../FanAuthProvider";

/**
 * Spin practice: the cue ball and a ball or two, nothing at stake. Pick a set-up, put the cue
 * ball anywhere, choose where the tip hits it and shoot — then it tells you what the cue ball
 * did (came back, rolled on, stopped, off the cushion at what angle).
 */
type Drill = { id: string; label: string; tip: string; balls: BallState[] };
const ball = (id: number, x: number, y: number): BallState => ({ id, x, y, potted: false });
export const DRILLS: Drill[] = [
  { id: "straight", label: "Straight", tip: "Try low on the ball (draw) to bring it back, high (follow) to roll on", balls: [ball(0, 320, 250), ball(3, 560, 250)] },
  { id: "cut", label: "Cut", tip: "Draw and follow bend the cue ball's path after the hit", balls: [ball(0, 300, 330), ball(5, 560, 260)] },
  { id: "long", label: "Long draw", tip: "From far away a soft draw dies on the cloth — hit it firmer", balls: [ball(0, 140, 250), ball(2, 640, 250)] },
  { id: "cushion", label: "Cushion", tip: "Side spin: left or right changes the angle it comes off the cushion", balls: [ball(0, 700, 250)] },
];
const widths = (d: number) => `${(Math.abs(d) / (2 * R)).toFixed(1)} ball-widths`;

/** What the cue ball did, in words: after the hit, up to its first cushion (or the cushion's angle, with no ball to hit). */
function describe(start: BallState[], shot: Shot): string {
  const len = Math.sqrt(shot.dx * shot.dx + shot.dy * shot.dy) || 1;
  const ux = shot.dx / len;
  const uy = shot.dy / len;
  const sp = shot.spin ?? { x: 0, y: 0 };
  const kind = sp.y < -0.15 ? "Draw" : sp.y > 0.15 ? "Follow" : Math.abs(sp.x) > 0.15 ? `${sp.x > 0 ? "Right" : "Left"} side` : "Centre";
  const others = start.filter((b) => b.id !== 0);
  const atRail = (b: BallState) => b.x <= R + 0.5 || b.x >= W - R - 0.5 || b.y <= R + 0.5 || b.y >= H - R - 0.5;
  let contact: { x: number; y: number } | null = null;
  let along = 0; // how far along the aim the cue ball went after the hit (− = back)
  let toCushion = false;
  let done = false;
  let clear = false; // the cue ball has come away from the ball it hit
  let prev: BallState | null = null;
  let bounceAt: { x: number; y: number } | null = null;
  let firstOut: { dx: number; dy: number } | null = null;
  const res = simulate(start, shot, (list) => {
    const c = list.find((b) => b.id === 0)!;
    if (others.length) {
      if (!contact && others.some((o) => list.find((b) => b.id === o.id)!.x !== o.x)) contact = { x: c.x, y: c.y };
      else if (contact && !done) {
        // Stop at its first cushion — or when a ball comes back and hits it again (that's not the spin)
        const near = list.some((b) => b.id !== 0 && !b.potted && (b.x - c.x) ** 2 + (b.y - c.y) ** 2 < (2 * R + 0.5) ** 2);
        if (near && clear) {
          done = true;
          return;
        }
        if (!near) clear = true;
        along = (c.x - contact.x) * ux + (c.y - contact.y) * uy;
        if (atRail(c) || c.potted) {
          done = true;
          toCushion = !c.potted;
        }
      }
    } else if (prev) {
      // No ball: the angle it comes off its first cushion at
      if (!bounceAt && (c.x - prev.x) * ux + (c.y - prev.y) * uy < 0) bounceAt = { x: c.x, y: c.y };
      else if (bounceAt && !firstOut && Math.hypot(c.x - bounceAt.x, c.y - bounceAt.y) > 20) firstOut = { dx: c.x - bounceAt.x, dy: c.y - bounceAt.y };
    }
    prev = { ...c };
  });
  const end = res.balls.find((b) => b.id === 0)!;
  if (!others.length) {
    if (!firstOut) return `${kind}: it didn't reach the cushion`;
    const f = firstOut as { dx: number; dy: number };
    // The angle off the cushion, to the shooter's right (+) or left (−)
    const back = -(f.dx * ux + f.dy * uy);
    const side = f.dx * -uy + f.dy * ux;
    const deg = Math.round((Math.atan2(side, back) * 180) / Math.PI);
    return `${kind}: came off the cushion ${deg === 0 ? "straight back" : `${Math.abs(deg)}° to the ${deg > 0 ? "right" : "left"}`}${end.potted ? " (and went in)" : ""}`;
  }
  if (!contact) return `${kind}: missed — no ball hit`;
  const tail = toCushion ? " — all the way to the cushion" : end.potted ? " — and into a pocket" : "";
  if (Math.abs(along) < 2 * R * 0.6) return `${kind}: the cue ball stopped dead where it hit (a stun shot)`;
  return along < 0 ? `${kind}: the cue ball came back ${widths(along)}${tail}` : `${kind}: the cue ball rolled on ${widths(along)}${tail}`;
}

export function PoolDrill({ onExit }: { onExit: () => void }) {
  const { user } = useFanAuth();
  const [drill, setDrill] = useState(DRILLS[0]);
  const [balls, setBalls] = useState<BallState[]>(DRILLS[0].balls);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const pending = useRef<BallState[] | null>(null);
  const key = useRef(0);

  const choose = (d: Drill) => {
    if (playback) return;
    setDrill(d);
    setBalls(d.balls);
    setMessage(null);
  };
  const shoot = useCallback(
    (shot: Shot, cue?: { x: number; y: number }) => {
      const start = balls.map((b) => (b.id === 0 && cue ? { ...b, x: cue.x, y: cue.y, potted: false } : { ...b }));
      pending.current = simulate(start, shot).balls;
      setMessage(describe(start, shot));
      setPlayback({ key: ++key.current, start, shot });
    },
    [balls]
  );
  const onPlayed = useCallback(() => {
    const end = pending.current;
    pending.current = null;
    setPlayback(null);
    // A potted ball comes back to where the set-up had it
    if (end) setBalls(end.map((b) => (b.potted ? (drill.balls.find((d) => d.id === b.id) ?? b) : b)));
  }, [drill]);

  return (
    <PoolStage
      label="DMY Pool spin practice"
      hud={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <StageMenu items={[{ label: "🏠 Back to the lobby", onClick: onExit }]} />
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto" role="radiogroup" aria-label="Set-up">
            {DRILLS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={drill.id === d.id}
                onClick={() => choose(d)}
                className={`min-h-[40px] shrink-0 rounded-xl border px-3 text-xs font-semibold ${drill.id === d.id ? "border-[#5eead4] bg-[#5eead4]/15 text-white" : "border-white/10 bg-white/[0.04] text-slate-300"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <span className="hidden shrink-0 text-[11px] font-bold uppercase tracking-wider text-[#facc15] sm:inline">🎯 Spin practice</span>
          <StageButton label="Set it up again" onClick={() => choose(drill)}>
            ↺
          </StageButton>
        </div>
      }
      status={
        playback ? "…" : message ? <span className="font-semibold text-white" data-drill-result>{message}</span> : note ? <span className="text-yellow-200">{drill.tip}</span> : drill.tip
      }
    >
      <PoolTable
        fill
        balls={balls}
        playback={playback}
        onPlayed={onPlayed}
        canShoot={!playback}
        ballInHand
        breakShot={false}
        target={null}
        onShoot={shoot}
        cueDesign={user?.cueDesign}
        onNote={setNote}
      />
    </PoolStage>
  );
}
