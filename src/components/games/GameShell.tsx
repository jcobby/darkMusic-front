"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GAMES, type GameSlug } from "@/lib/games";
import { SoundtrackBar } from "./Soundtrack";

/** Frame around a game: back link, personal best, then the game itself. */
export function GameShell({
  slug,
  best,
  extra,
  children,
}: {
  slug: GameSlug;
  best: number | null;
  /** Shown under the game's title (e.g. a link to the prize leaderboard). */
  extra?: ReactNode;
  children: ReactNode;
}) {
  const game = GAMES.find((g) => g.slug === slug)!;
  return (
    <section className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3 text-sm">
          <Link href="/games" className="text-neutral-400 transition hover:text-white">
            ← All games
          </Link>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-neutral-300">
            Your best:{" "}
            <span className="font-bold text-white">
              {best === null ? "—" : `${best} ${game.scoreLabel}`}
            </span>
          </span>
        </div>
        <div className="mb-6">
          <p className="eyebrow mb-2">
            <span className="h-px w-6 bg-accent" />
            DMY Games
          </p>
          <h1 className="display-sm text-white">{game.title}</h1>
          {/* On phones the start screen explains the game — keep the board near the top */}
          <p className="mt-2 hidden max-w-xl text-sm text-neutral-400 sm:block">{game.blurb}</p>
          {extra}
        </div>
        <SoundtrackBar />
        {children}
      </div>
    </section>
  );
}

/** A multiple-choice answer button that shows right/wrong once answered. */
export function Choice({
  label,
  state,
  disabled,
  onClick,
}: {
  label: string;
  state: "idle" | "correct" | "wrong" | "dim";
  disabled: boolean;
  onClick: () => void;
}) {
  const style = {
    idle: "border-white/10 bg-white/[0.03] text-neutral-100 hover:border-accent/60 hover:bg-accent/10",
    correct: "border-accent bg-accent text-white",
    wrong: "border-white/15 bg-white/5 text-neutral-400 line-through",
    dim: "border-white/5 bg-white/[0.02] text-neutral-500",
  }[state];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${style}`}
    >
      {state === "correct" && "✓ "}
      {state === "wrong" && "✗ "}
      {label}
    </button>
  );
}

/**
 * Panel laid over a game board (start screen, game over). Centred when it fits;
 * when it doesn't — a small phone, or Android's larger text setting — it scrolls
 * instead of cutting off the bottom, where the Start / Play again buttons are.
 */
export function GameOverlay({ children, className = "bg-ink/80" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`absolute inset-0 flex overflow-y-auto overscroll-contain rounded-2xl p-4 backdrop-blur-sm sm:p-6 ${className}`}>
      <div className="m-auto w-full">{children}</div>
    </div>
  );
}

/** End-of-game panel shared by every game. */
export function GameOver({
  title,
  score,
  isBest,
  onRestart,
  children,
}: {
  title: string;
  score: string;
  isBest: boolean;
  onRestart: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="text-center">
      <p className="eyebrow justify-center">{title}</p>
      <p className="mt-2 font-display text-4xl font-bold text-white sm:mt-3 sm:text-5xl">{score}</p>
      {isBest && <p className="mt-2 text-sm font-semibold text-accent">New personal best!</p>}
      {/* The buttons come before the details, so they're on screen even on small phones */}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onRestart} className="btn-accent min-h-[48px]">
          Play again
        </button>
        <Link href="/games" className="btn-outline min-h-[48px]">
          More games
        </Link>
      </div>
      {children}
    </div>
  );
}
