"use client";

import { useEffect, useState } from "react";

/**
 * Beat Breaker's new season starts with November 2026: each day's best game adds up
 * (best days count, streak bonus, a weekly board — the backend's services/gameScoring)
 * and the game gets harder every level after 21 (overtime). Boards and saves say which
 * rules they use; this is for the game itself, before either has. NEXT_PUBLIC_GAME_DAILY_FROM
 * (YYYY-MM) moves it — keep it the same as the backend's GAME_DAILY_FROM.
 */
const FROM = /^\d{4}-\d{2}$/.test(process.env.NEXT_PUBLIC_GAME_DAILY_FROM || "") ? process.env.NEXT_PUBLIC_GAME_DAILY_FROM! : "2026-11";
export const SEASON_START = Date.parse(`${FROM}-01T00:00:00Z`);
export const isNewSeason = () => Date.now() >= SEASON_START;

/** Levels after this one are overtime: faster every level, with a narrower paddle. */
export const OVERTIME_AFTER = 21;

/** Whether the new season has started — worked out after mount, so server and browser markup match. */
export function useNewSeason() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(isNewSeason()), []);
  return on;
}
