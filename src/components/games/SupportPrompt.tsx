"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, SupportModal } from "../SupportTheYard";

/*
 * "You've enjoyed 60 minutes of free entertainment…" — a voluntary-donation ask (GH₵5,
 * GH₵10 or any amount) for players who've been at it a while:
 *  - first after 60 minutes of active play (counted while a match or game is on and the
 *    page is in view), and only at a break — when a match or frame has just ended, never
 *    in the middle of one;
 *  - Support DMY → the tip form; a completed donation (the thank-you page) pauses the ask
 *    for 30 days;
 *  - Maybe later → not for 7 days; No thanks → they carry on, and it's not for 30 days;
 *  - after each ask, the next one needs another 60 minutes of play as well.
 * The choice is remembered in this browser.
 */

const PLAYED_KEY = "dmy_play_seconds";
const SNOOZE_KEY = "dmy_support_snooze_until";
const ASK_AFTER_S = 60 * 60;
const DAY = 86400e3;

const read = (key: string) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};
const write = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* private mode: it lasts for this visit only */
  }
};

/** Don't ask again for `days`, and count play time from zero. (The thank-you page calls this with 30 after a donation.) */
export function snoozeSupportPrompt(days: number) {
  write(SNOOZE_KEY, Date.now() + days * DAY);
  write(PLAYED_KEY, 0);
}

/** Count active play time while `active` and the page is in view. */
export function usePlayTime(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let pending = 0;
    const flush = () => {
      if (pending) write(PLAYED_KEY, read(PLAYED_KEY) + pending);
      pending = 0;
    };
    const id = setInterval(() => {
      if (document.hidden) return;
      if (++pending >= 15) flush();
    }, 1000);
    return () => {
      clearInterval(id);
      flush();
    };
  }, [active]);
}

/**
 * The ask itself: call `atBreak()` when a match or frame has just ended; it shows if
 * they've played 60 minutes and it isn't snoozed. Render `prompt` somewhere on the page.
 */
const TIP_PRESETS = [5, 10];

export function useSupportPrompt() {
  const [open, setOpen] = useState<"ask" | "tip" | null>(null);
  const [tip, setTip] = useState(0); // the amount they picked (0: any amount)
  const asked = useRef(false); // once per page visit at most

  const atBreak = useCallback(() => {
    if (asked.current || read(PLAYED_KEY) < ASK_AFTER_S || Date.now() < read(SNOOZE_KEY)) return;
    asked.current = true;
    setOpen("ask");
  }, []);

  /** An amount picked: on to the tip form with it chosen (a finished donation makes the snooze 30 days — the thank-you page). */
  const give = (amount: number) => {
    snoozeSupportPrompt(7);
    setTip(amount);
    setOpen("tip");
  };

  const prompt =
    open === "tip" ? (
      <SupportModal
        onClose={() => setOpen(null)}
        heading="Support Dark Music Yard"
        intro="Help us keep the games free for everyone. Thank you ❤️"
        context="Games: 60 minutes of free entertainment"
        presets={TIP_PRESETS}
        initialAmount={tip}
      />
    ) : open === "ask" ? (
      <Modal
        title="Support Dark Music Yard"
        onClose={() => {
          snoozeSupportPrompt(7); // closed without choosing: treat as "maybe later"
          setOpen(null);
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">🎱🧠🖤 Free for everyone</p>
        <h2 className="mt-2 pr-10 font-display text-2xl font-bold leading-snug text-white">
          You&apos;ve enjoyed 60 minutes of free entertainment on Dark Music Yard!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">Help us keep the games free for everyone.</p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">
          Would you like to support us with <b className="text-white">GH₵5</b>, <b className="text-white">GH₵10</b>, or any amount?
        </p>
        <div className="mt-5 grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            {TIP_PRESETS.map((n) => (
              <button key={n} type="button" onClick={() => give(n)} className="btn-accent min-h-[52px] justify-center text-base">
                GH₵{n}
              </button>
            ))}
            <button type="button" onClick={() => give(0)} className="btn-accent min-h-[52px] justify-center px-2 text-sm">
              Any amount
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                snoozeSupportPrompt(7);
                setOpen(null);
              }}
              className="btn-outline min-h-[48px] justify-center"
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={() => {
                snoozeSupportPrompt(30);
                setOpen(null);
              }}
              className="btn-outline min-h-[48px] justify-center"
            >
              No thanks
            </button>
          </div>
        </div>
      </Modal>
    ) : null;

  return { prompt, atBreak };
}
