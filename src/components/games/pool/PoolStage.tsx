"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { NameColor, MemberTier } from "@/lib/api";
import { useSoundtrack } from "../Soundtrack";
import { useGameRunning } from "../useGameRunning";

/*
 * Full-screen play, laid out like 8 Ball Pool: the players' bar across the top (avatars with
 * the turn timer round them, names, a row of each player's balls still on the table, the
 * match in the middle), one line for what's happening, and the table with its controls
 * filling the rest. On a phone it plays upright — the table stands up the screen, the
 * controls under it — and on a wide screen the table lies down with the controls either side.
 */

export function PoolStage({
  hud,
  status,
  children,
  sheet,
  label = "DMY Pool",
}: {
  hud: ReactNode; // the top bar (StageHud, or the practice set-ups)
  status: ReactNode; // whose shot, what just happened, a chat message
  children: ReactNode; // the table (PoolTable with fill)
  sheet?: ReactNode; // something sliding up from the bottom (the chat, the frame's result)
  label?: string;
}) {
  // The page under it doesn't scroll while you play, and the site's side tabs step aside
  const [host, setHost] = useState<HTMLElement | null>(null);
  useGameRunning(true);
  useEffect(() => {
    setHost(document.body);
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);
  if (!host) return null;
  // Straight on the page's body: above the site's toasts and players (which sit outside the main column)
  return createPortal(
    <div
      role="region"
      aria-label={label}
      className="fixed inset-0 z-[65] flex flex-col bg-[radial-gradient(120%_90%_at_50%_45%,#24304d_0%,#141b2e_55%,#0a0e19_100%)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]"
      style={{ height: "100dvh" }}
      data-pool-stage
    >
      <div className="shrink-0 px-2 pt-1.5 sm:px-4" data-stage-bar>
        {hud}
      </div>
      <div className="flex h-6 shrink-0 items-center justify-center px-3" aria-live="polite">
        <div className="line-clamp-1 min-w-0 text-center text-[12px] leading-tight text-slate-200 sm:text-[13px]">{status}</div>
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2 sm:px-4 sm:pb-3" data-stage-table>
        {children}
      </div>
      {sheet}
    </div>,
    host
  );
}

// ---------- Full screen ----------

/** Full screen — and on a phone, held upright (where the browser allows: Android). */
async function goFullScreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
  } catch {
    /* not allowed here (iPhone Safari) */
  }
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  try {
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.("portrait");
  } catch {
    /* not supported */
  }
}

// ---------- The players' bar ----------

export interface HudBall {
  id: number;
  potted: boolean;
}
export interface HudPlayer {
  name: string;
  initials?: string;
  color?: NameColor | null; // their name colour, for the avatar
  emoji?: string; // instead of initials (🤖 for the computer)
  member?: MemberTier | null;
  sub?: string | null; // e.g. "★ 1012" (pool rating)
  frames: number;
  active: boolean; // their shot
  timeLeft?: number | null; // 0–1 of the turn left (the ring round the avatar)
  balls: HudBall[] | null; // their 7 (null: not decided yet)
  onEight?: boolean; // all of theirs are down: the 8 is theirs
}

const AVATAR: Record<NameColor | "none", string> = {
  none: "from-[#6d28d9] to-[#2e1065]",
  purple: "from-[#c026d3] to-[#581c87]",
  emerald: "from-[#10b981] to-[#064e3b]",
  gold: "from-[#facc15] to-[#92400e]",
  sky: "from-[#38bdf8] to-[#1e3a8a]",
  rose: "from-[#fb7185] to-[#881337]",
  ice: "from-[#e0f2fe] to-[#64748b]",
};
const MEMBER_BADGE: Record<MemberTier, string> = { supporter: "💜", vip: "💎", legend: "👑" };
const BALL_COLORS: Record<number, string> = { 1: "#f5c400", 2: "#1f4fd1", 3: "#d42020", 4: "#6a2bbf", 5: "#f07a10", 6: "#1a8a3a", 7: "#7a1f1f", 8: "#111111" };
export const ballColor = (id: number) => BALL_COLORS[id > 8 ? id - 8 : id];
export const initialsOf = (name: string) =>
  name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** A small ball: solid, stripe, or an empty slot once it's gone. */
export function MiniBall({ id, potted = false, size = 14 }: { id: number; potted?: boolean; size?: number }) {
  if (potted) return <span aria-hidden className="inline-block shrink-0 rounded-full border border-white/10 bg-black/40" style={{ width: size, height: size }} />;
  const c = ballColor(id);
  const stripe = id > 8;
  return (
    <span
      aria-hidden
      className="relative inline-block shrink-0 overflow-hidden rounded-full shadow-[inset_-1px_-2px_3px_rgba(0,0,0,0.45)]"
      style={{ width: size, height: size, background: stripe ? `linear-gradient(to bottom, #f4f4f4 0 24%, ${c} 24% 76%, #f4f4f4 76%)` : c }}
    >
      <span className="absolute left-[22%] top-[16%] h-[28%] w-[28%] rounded-full bg-white/70" />
    </span>
  );
}

/** A player's balls still to pot (empty slots for the ones gone), the 8 at the end. */
function BallTracker({ p, align }: { p: HudPlayer; align: "left" | "right" }) {
  const slots = p.balls ?? Array.from({ length: 7 }, (_, i) => ({ id: -1 - i, potted: true }));
  const left = p.balls ? p.balls.filter((b) => !b.potted).length : null;
  return (
    <div className={`flex items-center gap-[3px] ${align === "right" ? "flex-row-reverse" : ""}`} aria-label={left === null ? "Balls not decided yet" : p.onEight ? "On the 8" : `${left} to go`}>
      {slots.map((b) => (b.id < 0 ? <MiniBall key={b.id} id={1} potted size={12} /> : <MiniBall key={b.id} id={b.id} potted={b.potted} size={12} />))}
      <span className={`ml-0.5 mr-0.5 rounded-full ${p.onEight ? "ring-2 ring-yellow-300" : "opacity-30"}`}>
        <MiniBall id={8} size={12} />
      </span>
    </div>
  );
}

/** The avatar, with the turn timer as a ring round it. */
function HudAvatar({ p }: { p: HudPlayer }) {
  const left = p.active && typeof p.timeLeft === "number" ? Math.max(0, Math.min(1, p.timeLeft)) : null;
  const C = 2 * Math.PI * 23;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <div className={`absolute inset-[4px] grid place-items-center rounded-xl bg-gradient-to-br ${AVATAR[p.color ?? "none"]} text-[15px] font-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] ring-2 ${p.active ? "ring-[#5eead4]" : "ring-white/15"}`}>
        {p.emoji ?? p.initials ?? initialsOf(p.name)}
      </div>
      {left !== null && (
        <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
          <circle cx="24" cy="24" r="23" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="23" fill="none" stroke={left < 0.25 ? "#facc15" : "#5eead4"} strokeWidth="2.5" strokeDasharray={C} strokeDashoffset={C * (1 - left)} strokeLinecap="round" />
        </svg>
      )}
      {p.member && <span className="absolute -bottom-0.5 -right-0.5 text-[13px] drop-shadow">{MEMBER_BADGE[p.member]}</span>}
    </div>
  );
}

function HudSide({ p, align }: { p: HudPlayer; align: "left" | "right" }) {
  const right = align === "right";
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      <HudAvatar p={p} />
      <div className="hidden min-w-0 sm:block">
        <div className={`flex items-baseline gap-1.5 ${right ? "flex-row-reverse" : ""}`}>
          <span className={`truncate text-[13px] font-bold ${p.active ? "text-white" : "text-slate-300"}`}>{p.name}</span>
          {p.sub && <span className="shrink-0 text-[10px] font-semibold text-slate-400">{p.sub}</span>}
        </div>
        <div className="mt-1">
          <BallTracker p={p} align={align} />
        </div>
      </div>
    </div>
  );
}

/**
 * The players' bar: [menu] avatar · name · balls — the match and the frames — balls · name · avatar [buttons].
 * On a narrow (upright) screen the balls drop to a second line.
 */
export function StageHud({
  left,
  right,
  title,
  detail,
  leading,
  trailing,
}: {
  left: HudPlayer;
  right: HudPlayer;
  title: string; // "Ranked", "Friendly", "Practice"
  detail?: string; // e.g. "best of 3" — shown where there's room
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {leading}
        <HudSide p={left} align="left" />
        <div className="shrink-0 rounded-xl border border-white/10 bg-[#0b1020]/80 px-3 py-1 text-center shadow-inner">
          <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-[#facc15]">
            {title}
            {detail && <span className="hidden sm:inline"> · {detail}</span>}
          </p>
          <p className="font-display text-lg font-bold leading-none tabular-nums text-white">
            {left.frames}
            <span className="mx-1 text-slate-500">–</span>
            {right.frames}
          </p>
        </div>
        <HudSide p={right} align="right" />
        {trailing}
      </div>
      {/* Narrow (upright) screens: the names and the balls on their own line */}
      <div className="mt-1 flex items-center justify-between gap-2 px-0.5 sm:hidden">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`max-w-[5.5rem] truncate text-[12px] font-bold ${left.active ? "text-white" : "text-slate-400"}`}>{left.name}</span>
          <BallTracker p={left} align="left" />
        </div>
        <div className="flex min-w-0 flex-row-reverse items-center gap-1.5">
          <span className={`max-w-[5.5rem] truncate text-[12px] font-bold ${right.active ? "text-white" : "text-slate-400"}`}>{right.name}</span>
          <BallTracker p={right} align="right" />
        </div>
      </div>
    </div>
  );
}

/** Round icon button for the bar. */
export function StageButton({ label, onClick, children, badge }: { label: string; onClick: () => void; children: ReactNode; badge?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-base text-white transition hover:border-[#5eead4]"
    >
      {children}
      {badge ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{badge > 9 ? "9+" : badge}</span>
      ) : null}
    </button>
  );
}

/** The menu (≡, like 8 Ball Pool's): full screen, music on/off, and whatever the game adds (give up, re-rack…). */
export function StageMenu({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const s = useSoundtrack();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const [canFull, setCanFull] = useState(false);
  useEffect(() => setCanFull(Boolean(document.fullscreenEnabled)), []);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const all = [
    ...(canFull ? [{ label: "⛶ Full screen", onClick: () => void goFullScreen() }] : []),
    ...(s ? [{ label: s.muted ? "🔊 Music on" : "🔇 Music off", onClick: s.toggleMute }] : []),
    ...items,
  ];
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        title="Menu"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#4ade80] to-[#15803d] text-lg font-black text-white shadow-[0_2px_0_#14532d,0_4px_10px_rgba(0,0,0,0.4)]"
      >
        ≡
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-40 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#141b2e] py-1 shadow-xl" role="menu">
          {all.map((i) => (
            <button
              key={i.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                i.onClick();
              }}
              className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 ${"danger" in i && i.danger ? "text-red-300" : "text-white"}`}
            >
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A panel sliding up from the bottom of the game (the chat). Kept mounted while closed, so it keeps listening. */
export function StageSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 z-20 mx-auto max-h-[70%] max-w-2xl overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#141b2e]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur ${open ? "" : "hidden"}`}>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:bg-white/10">
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

/** A player's 7 balls for the bar (null until the groups are decided), and whether they're on the 8. */
export function trackerOf(balls: { id: number; potted: boolean }[], group: "solids" | "stripes" | null) {
  if (!group) return { balls: null, onEight: false };
  const ids = group === "solids" ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
  const list = ids.map((id) => ({ id, potted: balls.find((b) => b.id === id)?.potted ?? true }));
  return { balls: list, onEight: list.every((b) => b.potted) };
}
