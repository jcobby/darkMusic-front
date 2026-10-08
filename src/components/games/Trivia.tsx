"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GameShell, GameOver, Choice } from "./GameShell";
import { useSoundtrack } from "./Soundtrack";
import { shuffle } from "@/lib/games";
import { useBestScore } from "@/lib/useBestScore";
import { TRIVIA, TRIVIA_PER_GAME } from "@/config/trivia";

interface Asked {
  q: string;
  answer: string;
  options: string[];
}

const deal = (): Asked[] =>
  shuffle(TRIVIA)
    .slice(0, TRIVIA_PER_GAME)
    .map((t) => ({ q: t.q, answer: t.answer, options: shuffle([t.answer, ...t.wrong]) }));

const VERDICT = (score: number, total: number) =>
  score === total
    ? "Certified DMY day one. 🔥"
    : score >= total * 0.75
    ? "You know the Yard well."
    : score >= total / 2
    ? "Not bad — read the artist profile and go again."
    : "Time to catch up on the Yard.";

/** Multiple-choice quiz about Lenko Psycho and Dark Music Yard. */
export function Trivia() {
  const [questions, setQuestions] = useState<Asked[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [isBest, setIsBest] = useState(false);
  const { best, submit } = useBestScore("trivia");
  const soundtrack = useSoundtrack();

  const restart = useCallback(() => {
    setQuestions(deal());
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setIsBest(false);
  }, []);

  // Deal on the client only, so the shuffle doesn't differ from the server render.
  useEffect(restart, [restart]);

  const current = questions[index];

  function choose(option: string) {
    if (picked || !current) return;
    if (index === 0) soundtrack?.start();
    setPicked(option);
    if (option === current.answer) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setIsBest(submit(score));
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }

  return (
    <GameShell slug="trivia" best={best}>
      <div className="card p-5 sm:p-8">
        {done ? (
          <div className="py-6">
            <GameOver
              title="Your score"
              score={`${score}/${questions.length}`}
              isBest={isBest}
              onRestart={restart}
            >
              <p className="mt-2 text-sm text-neutral-300">{VERDICT(score, questions.length)}</p>
              <Link href="/about" className="mt-1 inline-block text-sm text-accent hover:underline">
                Read the artist profile →
              </Link>
            </GameOver>
          </div>
        ) : current ? (
          <>
            <div className="mb-5 flex items-center justify-between text-sm text-neutral-400">
              <span>
                Question {index + 1}/{questions.length}
              </span>
              <span>
                Score <span className="font-bold text-white">{score}</span>
              </span>
            </div>
            <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-deep to-accent transition-[width] duration-300"
                style={{ width: `${((index + (picked ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
            <h2 className="font-display text-2xl font-bold leading-snug text-white sm:text-3xl">
              {current.q}
            </h2>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {current.options.map((opt) => (
                <Choice
                  key={opt}
                  label={opt}
                  disabled={picked !== null}
                  onClick={() => choose(opt)}
                  state={
                    !picked
                      ? "idle"
                      : opt === current.answer
                      ? "correct"
                      : opt === picked
                      ? "wrong"
                      : "dim"
                  }
                />
              ))}
            </div>
            {picked && (
              <button type="button" onClick={next} className="btn-accent mt-6 w-full sm:w-auto">
                {index + 1 >= questions.length ? "See your score" : "Next question →"}
              </button>
            )}
          </>
        ) : null}
      </div>
    </GameShell>
  );
}
