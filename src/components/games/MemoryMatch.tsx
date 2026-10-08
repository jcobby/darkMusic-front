"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, GameOver } from "./GameShell";
import { useSoundtrack } from "./Soundtrack";
import { shuffle } from "@/lib/games";
import { useBestScore } from "@/lib/useBestScore";
import { PHOTOS, type SitePhoto } from "@/config/media";

const PAIRS: SitePhoto[] = [
  PHOTOS.couchCrewColor,
  PHOTOS.carRedSeats,
  PHOTOS.setDmyTeeBw,
  PHOTOS.lounge,
  PHOTOS.handsUpBw,
  PHOTOS.carparkWalk,
  PHOTOS.setCameraCrew,
  PHOTOS.couchDuoBw,
];

interface Card {
  id: number;
  pair: number;
  photo: SitePhoto;
}

const newDeck = (): Card[] =>
  shuffle(PAIRS.flatMap((photo, pair) => [0, 1].map((k) => ({ id: pair * 2 + k, pair, photo }))));

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Flip two cards at a time; match all 8 pairs of DMY shoot photos. */
export function MemoryMatch() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [open, setOpen] = useState<number[]>([]); // indexes face-up, unmatched
  const [matched, setMatched] = useState<Set<number>>(new Set()); // pair ids
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [isBest, setIsBest] = useState(false);
  const lock = useRef(false);
  const { best, submit } = useBestScore("memory");
  const soundtrack = useSoundtrack();

  const won = deck.length > 0 && matched.size === PAIRS.length;

  // Shuffle on the client only (avoids a server/client mismatch), and warm the image cache.
  useEffect(() => {
    setDeck(newDeck());
    PAIRS.forEach((p) => {
      const img = new Image();
      img.src = p.src;
    });
  }, []);

  useEffect(() => {
    if (!started || won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, won]);

  function flip(i: number) {
    if (lock.current || won || open.includes(i) || matched.has(deck[i].pair)) return;
    if (!started) {
      setStarted(true);
      soundtrack?.start();
    }
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;

    const moveCount = moves + 1;
    setMoves(moveCount);
    const [a, b] = next;
    if (deck[a].pair === deck[b].pair) {
      const nowMatched = new Set(matched).add(deck[a].pair);
      setMatched(nowMatched);
      setOpen([]);
      if (nowMatched.size === PAIRS.length) setIsBest(submit(moveCount));
    } else {
      lock.current = true;
      setTimeout(() => {
        setOpen([]);
        lock.current = false;
      }, 850);
    }
  }

  function restart() {
    setDeck(newDeck());
    setOpen([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setIsBest(false);
    lock.current = false;
  }

  return (
    <GameShell slug="memory" best={best}>
      <div className="card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-neutral-300">
            Moves <span className="font-display text-lg font-bold text-white">{moves}</span>
          </span>
          <span className="text-neutral-300">
            Pairs{" "}
            <span className="font-display text-lg font-bold text-accent">
              {matched.size}/{PAIRS.length}
            </span>
          </span>
          <span className="tabular-nums text-neutral-300">⏱ {formatTime(seconds)}</span>
        </div>

        {won ? (
          <div className="py-8">
            <GameOver
              title="All pairs found"
              score={`${moves} moves`}
              isBest={isBest}
              onRestart={restart}
            >
              <p className="mt-2 text-sm text-neutral-400">in {formatTime(seconds)}</p>
            </GameOver>
          </div>
        ) : (
          <div className="mx-auto grid max-w-lg grid-cols-4 gap-2 sm:gap-3">
            {deck.map((card, i) => {
              const faceUp = open.includes(i) || matched.has(card.pair);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => flip(i)}
                  aria-label={faceUp ? card.photo.alt : `Card ${i + 1}, face down`}
                  className="aspect-[3/4] [perspective:800px]"
                >
                  <span
                    className={`relative block h-full w-full rounded-xl transition-transform duration-500 [transform-style:preserve-3d] ${
                      faceUp ? "[transform:rotateY(180deg)]" : ""
                    }`}
                  >
                    {/* Back of the card */}
                    <span className="absolute inset-0 grid place-items-center rounded-xl border border-accent/30 bg-gradient-to-br from-accent-deep via-ink-700 to-ink [backface-visibility:hidden]">
                      <span className="font-display text-sm font-bold tracking-widest text-white/80 sm:text-base">
                        DMY
                      </span>
                    </span>
                    {/* Photo side */}
                    <span
                      className={`absolute inset-0 overflow-hidden rounded-xl border [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                        matched.has(card.pair) ? "border-accent" : "border-white/20"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.photo.src}
                        alt=""
                        className="h-full w-full object-cover"
                        style={{ objectPosition: card.photo.position }}
                      />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </GameShell>
  );
}
