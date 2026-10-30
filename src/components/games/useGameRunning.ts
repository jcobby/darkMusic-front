"use client";

import { useEffect } from "react";

/**
 * Flag the page while a game is in play (`html[data-game-running]`): the Feedback and
 * Support tabs step out of the way, and decorative animations pause (globals.css).
 */
export function useGameRunning(running: boolean) {
  useEffect(() => {
    const el = document.documentElement;
    if (running) el.setAttribute("data-game-running", "");
    else el.removeAttribute("data-game-running");
    return () => el.removeAttribute("data-game-running");
  }, [running]);
}
