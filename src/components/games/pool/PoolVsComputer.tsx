"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ballsLeft, judge, newFrame, simulate, type Frame, type Shot } from "@/lib/pool/engine";
import { cpuMove, type CpuLevel } from "@/lib/pool/cpu";
import { PoolTable, type Playback } from "./PoolTable";
import { PoolStage, StageHud, StageMenu, initialsOf, trackerOf, type HudPlayer } from "./PoolStage";
import { describeOutcome } from "./shotText";
import { usePlayTime, useSupportPrompt } from "../SupportPrompt";
import { useFanAuth } from "../../FanAuthProvider";
import { useGameRunning } from "../useGameRunning";

export const CPU_LEVELS: { id: CpuLevel; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "normal", label: "Normal" },
  { id: "hard", label: "Hard" },
];

/** A random order for the rack's other balls. */
function shuffledRack() {
  const ids = [2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return [...ids, 1, 9, 8];
}

const name = (i: 0 | 1) => (i === 0 ? "You" : "Computer");

/**
 * DMY Pool against the computer — for when there's nobody to play. It runs in the
 * browser with the same table and rules as a real match; nothing is saved or ranked.
 * You break the first frame, then you take turns.
 */
export function PoolVsComputer({ level, onExit }: { level: CpuLevel; onExit: () => void }) {
  const [frame, setFrame] = useState<Frame>(() => newFrame(shuffledRack(), 0));
  const [frames, setFrames] = useState<[number, number]>([0, 0]);
  const [frameNo, setFrameNo] = useState(1);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef<{ frame: Frame; frames: [number, number]; text: string } | null>(null);
  const key = useRef(0);
  const [note, setNote] = useState<string | null>(null); // "ball in hand", "two shots"

  /** Play a shot out (placing the cue ball first with ball in hand); the table animates it, then it counts. */
  const play = useCallback(
    (before: Frame, shot: Shot, cue?: { x: number; y: number }) => {
      const start: Frame = {
        ...before,
        balls: before.balls.map((b) => (b.id === 0 && before.ballInHand && cue ? { ...b, x: cue.x, y: cue.y, potted: false } : { ...b })),
      };
      const { frame: next, outcome } = judge(start, simulate(start.balls, shot));
      const w = outcome.frameWinner;
      const after: [number, number] = w === null ? frames : w === 0 ? [frames[0] + 1, frames[1]] : [frames[0], frames[1] + 1];
      pending.current = { frame: next, frames: after, text: describeOutcome(outcome, start.turn, name, 0, after) };
      setPlayback({ key: ++key.current, start: start.balls, shot });
    },
    [frames]
  );

  const onPlayed = useCallback(() => {
    const p = pending.current;
    pending.current = null;
    setPlayback(null);
    if (!p) return;
    setFrame(p.frame);
    setFrames(p.frames);
    setMessage(p.text);
  }, []);

  const { user } = useFanAuth(); // their cue design
  // Play time for the support ask, which only ever comes once a frame is over
  const { prompt, atBreak } = useSupportPrompt();
  usePlayTime(frame.winner === null);
  useGameRunning(frame.winner === null);
  useEffect(() => {
    if (frame.winner !== null) atBreak();
  }, [frame.winner, atBreak]);

  // The computer's turn: a moment to "line it up", then its shot
  const cpuTurn = frame.turn === 1 && frame.winner === null && !playback;
  useEffect(() => {
    if (!cpuTurn) return;
    const id = setTimeout(() => {
      const move = cpuMove(frame, level);
      play(frame, move.shot, move.cue);
    }, 900);
    return () => clearTimeout(id);
  }, [cpuTurn, frame, level, play]);

  function nextFrame() {
    const n = frameNo + 1;
    setFrameNo(n);
    setFrame(newFrame(shuffledRack(), n % 2 === 1 ? 0 : 1)); // take turns to break
    setMessage(null);
  }

  const myTurn = frame.turn === 0 && frame.winner === null && !playback;
  const myGroup = frame.groups[0];
  const target = myGroup ? (ballsLeft(frame, 0) === 0 ? "eight" : myGroup) : null;
  const levelLabel = CPU_LEVELS.find((l) => l.id === level)?.label ?? level;

  const hudPlayer = (i: 0 | 1): HudPlayer => {
    const t = trackerOf(frame.balls, frame.groups[i]);
    return {
      name: i === 0 ? "You" : "Computer",
      initials: i === 0 ? initialsOf(user?.name || "You") : undefined,
      emoji: i === 1 ? "🤖" : undefined,
      color: i === 0 ? (user?.nameColor ?? null) : null,
      member: i === 0 ? (user?.member?.tier ?? null) : null,
      sub: i === 1 ? levelLabel : null,
      frames: frames[i],
      active: frame.winner === null && frame.turn === i,
      balls: t.balls,
      onEight: t.onEight,
    };
  };
  const over = frame.winner !== null && !playback;
  const reRack = () => {
    if (!playback && confirm("Start this frame again?")) {
      setFrame(newFrame(shuffledRack(), frameNo % 2 === 1 ? 0 : 1)); // same breaker as this frame
      setMessage(null);
    }
  };

  // The whole screen is the table — with the frame's result over it when it's done
  return (
    <>
      <PoolStage
        label="DMY Pool against the computer"
        hud={
          <StageHud
            left={hudPlayer(0)}
            right={hudPlayer(1)}
            title="Practice"
            detail={`frame ${frameNo}`}
            leading={<StageMenu items={[{ label: "🔄 Re-rack this frame", onClick: reRack }, { label: "🏠 Back to the lobby", onClick: onExit }]} />}
          />
        }
        status={
          note && myTurn ? (
            <span className="font-semibold text-yellow-200">{note}</span>
          ) : frame.winner === null && !playback ? (
            `${myTurn ? "Your shot" : `The computer's shot${frame.twoShots ? " (two shots)" : ""}`}${message ? ` — ${message}` : ""}`
          ) : (
            message
          )
        }
        sheet={
          over ? (
            <div className="absolute inset-x-0 bottom-0 z-20 max-h-[80%] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-800/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center shadow-2xl backdrop-blur">
              {prompt && <div className="mb-4 text-left">{prompt}</div>}
              <p className="font-display text-2xl font-bold text-white">{frame.winner === 0 ? "🏆 Your frame!" : "The computer takes it"}</p>
              <p className="mt-1 text-sm text-neutral-300">
                You {frames[0]} – {frames[1]} Computer
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={nextFrame} className="btn-accent min-h-[48px]">
                  🎱 Next frame
                </button>
                <button type="button" onClick={onExit} className="btn-outline min-h-[48px]">
                  Lobby
                </button>
              </div>
            </div>
          ) : null
        }
      >
        <PoolTable
          fill
          balls={frame.balls}
          playback={playback}
          onPlayed={onPlayed}
          canShoot={myTurn}
          ballInHand={frame.ballInHand}
          breakShot={frame.breakShot}
          kitchen={frame.kitchen === true}
          twoShots={frame.twoShots === true}
          cueDesign={user?.cueDesign}
          target={target}
          onShoot={(shot, cue) => myTurn && play(frame, shot, cue)}
          waiting="The computer's shot"
          onNote={setNote}
        />
      </PoolStage>
    </>
  );
}
