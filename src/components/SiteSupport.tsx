"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Modal, SupportModal } from "./SupportTheYard";
import { useFanAuth } from "./FanAuthProvider";

/*
 * Support, without getting in the way:
 *  - the "❤ Support" tab on the right edge of every page (the twin of the Feedback tab on
 *    the left) — always there, never covering a game (hidden while one is running);
 *  - the membership invitation, once a fan has come back for a third visit — not in a game,
 *    never to members, and not again for 30 days whatever they choose.
 */

const VISITS_KEY = "dmy_visits";
const LAST_KEY = "dmy_visit_last";
const INVITE_SNOOZE_KEY = "dmy_member_invite_snooze";
const NEW_VISIT_AFTER_MS = 30 * 60e3; // 30 minutes away = a new visit
const INVITE_FROM_VISIT = 3;
const DAY = 86400e3;

const read = (k: string) => {
  try {
    return Number(localStorage.getItem(k)) || 0;
  } catch {
    return 0;
  }
};
const write = (k: string, v: number) => {
  try {
    localStorage.setItem(k, String(v));
  } catch {
    /* private mode */
  }
};

/** In a game (not the games list) or a page where an invite would be in the way. */
const quietPage = (path: string) => path.startsWith("/admin") || path.startsWith("/membership") || path.startsWith("/support") || /^\/games\/./.test(path);

export function SupportTab() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Support Dark Music Yard"
        className="support-tab fixed right-0 top-1/2 z-[43] -translate-y-1/2 rounded-l-xl border border-r-0 border-accent/40 bg-ink-700/90 px-1.5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-glow-sm backdrop-blur-sm transition hover:bg-accent [writing-mode:vertical-rl]"
      >
        ❤ Support
      </button>
      {open && <SupportModal onClose={() => setOpen(false)} heading="Support Dark Music Yard" context="Tip via the Support tab" />}
    </>
  );
}

export function MembershipInvite() {
  const pathname = usePathname() || "/";
  const { user, loading } = useFanAuth();
  const [open, setOpen] = useState(false);

  // Count visits: a page view after 30+ minutes away starts a new one
  useEffect(() => {
    const now = Date.now();
    if (now - read(LAST_KEY) > NEW_VISIT_AFTER_MS) write(VISITS_KEY, read(VISITS_KEY) + 1);
    write(LAST_KEY, now);
  }, [pathname]);

  useEffect(() => {
    if (loading || user?.member || quietPage(pathname)) return;
    if (read(VISITS_KEY) < INVITE_FROM_VISIT || Date.now() < read(INVITE_SNOOZE_KEY)) return;
    const id = setTimeout(() => setOpen(true), 8000); // let the page settle (and any other note show first)
    return () => clearTimeout(id);
  }, [pathname, loading, user]);

  if (!open || quietPage(pathname)) return null;
  const done = () => {
    write(INVITE_SNOOZE_KEY, Date.now() + 30 * DAY);
    setOpen(false);
  };
  return (
    <Modal title="Become a DMY Supporter" onClose={done}>
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">💜 You keep coming back</p>
      <h2 className="mt-2 pr-10 font-display text-2xl font-bold text-white">Become a DMY Supporter</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-300">
        Thank you for being here. The games stay <b className="text-white">free for everyone</b> — and if you&apos;d like to back the Yard, memberships start at
        GH₵10 a month.
      </p>
      <ul className="mt-3 space-y-1 text-sm text-neutral-300">
        <li>💜 A badge next to your name on every board</li>
        <li>💎 Exclusive Pool cues</li>
        <li>👑 Your name on the Supporter Wall</li>
      </ul>
      <div className="mt-5 grid gap-2">
        <Link href="/membership" onClick={done} className="btn-accent min-h-[52px] w-full justify-center text-base">
          See the memberships
        </Link>
        <button type="button" onClick={done} className="btn-outline min-h-[48px] w-full justify-center">
          Not now
        </button>
      </div>
    </Modal>
  );
}
