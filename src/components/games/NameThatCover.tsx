"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GameShell, GameOver, Choice } from "./GameShell";
import { useSoundtrack } from "./Soundtrack";
import { shuffle } from "@/lib/games";
import { useBestScore } from "@/lib/useBestScore";
import { getReleases, type Release } from "@/lib/api";
import { cdnImage } from "@/lib/cdn";

const ROUND_SECONDS = 10;
const MAX_ROUNDS = 5;

interface Round {
  release: Release;
  options: Release[];
  origin: string; // where the zoom starts, so it's not always the centre
}

function buildRounds(pool: Release[]): Round[] {
  return shuffle(pool)
    .slice(0, Math.min(MAX_ROUNDS, pool.length))
    .map((release) => ({
      release,
      options: shuffle([release, ...shuffle(pool.filter((r) => r.id !== release.id)).slice(0, 3)]),
      origin: `${25 + Math.round(Math.random() * 50)}% ${25 + Math.round(Math.random() * 50)}%`,
    }));
}

/** A release cover comes into focus — name it fast for more points. */
export function NameThatCover() {
  const [pool, setPool] = useState<Release[] | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [picked, setPicked] = useState<string | null>(null); // release id, or "timeout"
  const [score, setScore] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "playing" | "over">("loading");
  const [isBest, setIsBest] = useState(false);
  const startedAt = useRef(0);
  const { best, submit } = useBestScore("name-that-cover");
  const soundtrack = useSoundtrack();

  useEffect(() => {
    getReleases().then((all) => {
      const withCovers = all.filter((r) => r.coverImage);
      setPool(withCovers);
      setPhase("ready");
      // Warm the cache so covers don't pop in mid-round.
      withCovers.forEach((r) => {
        const img = new Image();
        img.src = cdnImage(r.coverImage!, 1000);
      });
    });
  }, []);

  const round = rounds[index];
  const answered = picked !== null;

  // Round clock: the cover un-zooms/un-blurs until time runs out.
  useEffect(() => {
    if (phase !== "playing" || answered) return;
    startedAt.current = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - startedAt.current) / 1000;
      if (t >= ROUND_SECONDS) {
        setElapsed(ROUND_SECONDS);
        setPicked("timeout");
        setLastPoints(0);
      } else {
        setElapsed(t);
      }
    }, 50);
    return () => clearInterval(id);
  }, [phase, index, answered]);

  const start = useCallback(() => {
    if (!pool) return;
    soundtrack?.start();
    setRounds(buildRounds(pool));
    setIndex(0);
    setScore(0);
    setElapsed(0);
    setPicked(null);
    setIsBest(false);
    setPhase("playing");
  }, [pool, soundtrack]);

  function answer(id: string) {
    if (answered || !round) return;
    const correct = id === round.release.id;
    // 100 for an instant answer, down to 10 at the buzzer.
    const points = correct ? Math.max(10, Math.round(100 * (1 - elapsed / ROUND_SECONDS))) : 0;
    setPicked(id);
    setLastPoints(points);
    setScore((s) => s + points);
  }

  function next() {
    if (index + 1 >= rounds.length) {
      setIsBest(submit(score));
      setPhase("over");
      return;
    }
    setIndex((i) => i + 1);
    setElapsed(0);
    setPicked(null);
  }

  const reveal = answered ? 1 : Math.min(1, elapsed / ROUND_SECONDS);

  return (
    <GameShell slug="name-that-cover" best={best}>
      <div className="card p-4 sm:p-6">
        {phase === "loading" && <p className="py-16 text-center text-neutral-400">Loading covers…</p>}

        {phase === "ready" &&
          (pool && pool.length >= 2 ? (
            <div className="py-8 text-center">
              <p className="font-display text-3xl font-bold text-white">Name That Cover</p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-neutral-400">
                {Math.min(MAX_ROUNDS, pool.length)} rounds. Each DMY cover starts zoomed in and blurry
                and sharpens over {ROUND_SECONDS} seconds — the faster you name it, the more points.
              </p>
              <button type="button" onClick={start} className="btn-accent mt-6">
                Start
              </button>
            </div>
          ) : (
            <p className="py-16 text-center text-neutral-400">
              More releases are on the way — check back soon.{" "}
              <Link href="/music" className="text-accent hover:underline">
                Browse music
              </Link>
            </p>
          ))}

        {phase === "playing" && round && (
          <div className="grid gap-5 sm:grid-cols-[1fr_1fr] sm:items-center">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-neutral-400">
                <span>
                  Round {index + 1}/{rounds.length}
                </span>
                <span>
                  Score <span className="font-bold text-white">{score}</span>
                </span>
              </div>
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cdnImage(round.release.coverImage!, 1000)}
                  alt={answered ? round.release.title : "Mystery cover"}
                  className="h-full w-full object-cover transition-[transform,filter] duration-100"
                  style={{
                    transform: `scale(${4 - 3 * reveal})`,
                    transformOrigin: round.origin,
                    filter: `blur(${(1 - reveal) * 14}px)`,
                  }}
                />
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-deep to-accent"
                  style={{ width: `${(1 - Math.min(1, elapsed / ROUND_SECONDS)) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {round.options.map((opt) => (
                <Choice
                  key={opt.id}
                  label={opt.title}
                  disabled={answered}
                  onClick={() => answer(opt.id)}
                  state={
                    !answered
                      ? "idle"
                      : opt.id === round.release.id
                      ? "correct"
                      : opt.id === picked
                      ? "wrong"
                      : "dim"
                  }
                />
              ))}
              {answered && (
                <div className="pt-2">
                  <p className="text-sm text-neutral-300">
                    {picked === "timeout"
                      ? "Time's up!"
                      : lastPoints > 0
                      ? `+${lastPoints} points`
                      : "Not this one."}
                  </p>
                  <button type="button" onClick={next} className="btn-accent mt-3 w-full">
                    {index + 1 >= rounds.length ? "See your score" : "Next cover →"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "over" && (
          <div className="py-8">
            <GameOver title="Final score" score={`${score} pts`} isBest={isBest} onRestart={start}>
              <p className="mt-2 text-sm text-neutral-400">
                out of {rounds.length * 100} ·{" "}
                <Link href="/music" className="text-accent hover:underline">
                  Listen to the songs
                </Link>
              </p>
            </GameOver>
          </div>
        )}
      </div>
    </GameShell>
  );
}
