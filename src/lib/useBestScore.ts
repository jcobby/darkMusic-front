"use client";

import { useCallback, useEffect, useState } from "react";
import { GAMES, bestKey, readBest, type GameSlug } from "./games";

/**
 * Personal best for a game, kept in this browser. `submit(score)` saves it if
 * it beats the old best (higher or lower, per the game) and returns whether it did.
 */
export function useBestScore(slug: GameSlug) {
  const better = GAMES.find((g) => g.slug === slug)!.better;
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => setBest(readBest(slug)), [slug]);

  const submit = useCallback(
    (score: number) => {
      const prev = readBest(slug);
      const isBest = prev === null || (better === "high" ? score > prev : score < prev);
      if (isBest) {
        try {
          localStorage.setItem(bestKey(slug), String(score));
        } catch {
          /* private mode — still report the result */
        }
        setBest(score);
      }
      return isBest;
    },
    [slug, better]
  );

  return { best, submit };
}
