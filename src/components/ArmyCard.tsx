"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getMyFlair, setNameColor, type MemberTier, type MyFlair, type NameColor } from "@/lib/api";
import { getFanToken, useFanAuth } from "./FanAuthProvider";
import { FanName, MEMBER_BADGE, NAME_COLOR_CLASS } from "./FanName";

/** How the boards show a name: first name + last initial. */
const boardName = (name: string | null) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Fan";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
};

/**
 * The fan's Lenko Army card on the account page: points, streak and rank, what the
 * daily check-in pays, the way to the next rank, their badges and the name colours
 * they've unlocked for the boards.
 */
/** The membership frame on the card: 💜 Supporter, 💎 VIP, 👑 Legend. */
const MEMBER_FRAME: Record<MemberTier, { frame: string; ribbon: string }> = {
  supporter: { frame: "border-accent/70 shadow-[0_0_24px_rgba(191,0,255,0.18)]", ribbon: "bg-accent/20 text-accent-soft" },
  vip: { frame: "border-cyan-300/60 shadow-[0_0_26px_rgba(103,232,249,0.18)]", ribbon: "bg-cyan-300/15 text-cyan-200" },
  legend: { frame: "border-yellow-400/80 shadow-[0_0_32px_rgba(250,204,21,0.25)]", ribbon: "bg-yellow-400 text-ink" },
};

export function ArmyCard() {
  const { user, checkIn } = useFanAuth();
  const [flair, setFlair] = useState<MyFlair | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = getFanToken();
    if (token) setFlair(await getMyFlair(token));
  }, []);
  // Again after every check-in (the site checks in by itself on opening)
  useEffect(() => {
    void load();
  }, [load, user?.lastCheckIn]);

  async function doCheckIn() {
    setMsg(null);
    try {
      const r = await checkIn();
      setMsg(
        r.alreadyCheckedIn
          ? "Already checked in today — come back tomorrow!"
          : r.promoted
            ? `🎖️ Promoted to ${r.promoted}! +${r.awarded} points`
            : `+${r.awarded} points! 🎉`
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Check-in failed");
    }
  }

  async function pick(color: NameColor | null) {
    const token = getFanToken();
    if (!token) return;
    setSaving(true);
    setMsg(null);
    try {
      setFlair(await setNameColor(token, color));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Couldn't change your colour");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  const done = flair?.checkIn.done ?? false;
  const next = flair?.next;
  const toGo = next && flair ? Math.max(0, next.days - flair.streak) : 0;
  const f = flair?.flair;
  const tier = user.member?.tier ?? null;

  return (
    <div id="army" className={`card scroll-mt-24 p-6 ${tier ? MEMBER_FRAME[tier].frame : ""}`}>
      {tier && user.member ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${MEMBER_FRAME[tier].ribbon}`}>
            {MEMBER_BADGE[tier].icon} {MEMBER_BADGE[tier].label}
          </span>
          <Link href="/membership" className="text-xs text-neutral-400 hover:text-white">
            until {new Date(user.member.until).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · renew →
          </Link>
        </div>
      ) : null}
      <p className="text-xs uppercase tracking-wider text-neutral-500">Signed in as</p>
      <p className="mt-1 font-semibold text-white">{user.email}</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-accent/20 bg-accent/[0.06] p-3 text-center">
          <p className="gradient-text font-display text-2xl font-bold sm:text-3xl">{user.points.toLocaleString()}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-neutral-400">Points</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <p className="font-display text-2xl font-bold text-white sm:text-3xl">{flair?.streak ?? user.streak}🔥</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-neutral-400">Day streak</p>
        </div>
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] p-3 text-center">
          {/* "Lieutenant" has to fit a third of a phone */}
          <p className="font-display text-[15px] font-bold leading-9 text-yellow-300 sm:text-xl">{flair?.rank.name ?? "…"}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-neutral-400">LA rank</p>
        </div>
      </div>

      <button onClick={doCheckIn} disabled={done} className="btn-accent mt-4 w-full justify-center disabled:opacity-50">
        {done ? `Checked in today ✓ · +${flair?.checkIn.points ?? 0}` : `Daily check-in (+${flair?.checkIn.points ?? 5})`}
      </button>
      {msg && <p className="mt-2 text-center text-sm font-semibold text-white">{msg}</p>}

      {flair && (
        <>
          {/* The way up */}
          <div className="mt-5">
            {next ? (
              <>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <p className="text-white">
                    {toGo === 0 ? "Check in to reach" : `${toGo} more day${toGo === 1 ? "" : "s"} in a row to`}{" "}
                    <b className="text-yellow-300">{next.name}</b>
                  </p>
                  <p className="shrink-0 text-xs text-neutral-400">+{next.bonus} bonus</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <div className="h-full rounded-full bg-yellow-400" style={{ width: `${Math.min(100, (flair.streak / next.days) * 100)}%` }} />
                </div>
              </>
            ) : (
              <p className="text-sm text-yellow-300">🎖️ You&apos;re a General — the top Lenko Army rank.</p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
              Ranks: {flair.ranks.map((r) => `${r.name}${r.days ? ` (${r.days}d)` : ""}`).join(" → ")}. Your rank comes from your longest streak —
              it never drops.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              Check-in pays more the longer you keep it going:{" "}
              {flair.checkIn.tiers.map((t) => `day ${t.fromDay}+ +${t.points}`).join(" · ")}.
            </p>
          </div>

          {/* Badges */}
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <p className="text-sm font-semibold text-white">Badges on the boards</p>
            {f && (f.months || f.weeks || f.events || f.sprints || f.trivia || f.streak >= 7) ? (
              <ul className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-200">
                {f.months > 0 && <li className="rounded-full bg-white/5 px-3 py-1">🏆 {f.months} Beat Breaker month{f.months === 1 ? "" : "s"} won</li>}
                {f.weeks > 0 && <li className="rounded-full bg-white/5 px-3 py-1">🏅 {f.weeks} weekly board{f.weeks === 1 ? "" : "s"} topped</li>}
                {f.events > 0 && <li className="rounded-full bg-white/5 px-3 py-1">⚡ {f.events} event{f.events === 1 ? "" : "s"} won</li>}
                {f.sprints > 0 && <li className="rounded-full bg-white/5 px-3 py-1">⏱ {f.sprints} daily sprint{f.sprints === 1 ? "" : "s"} won</li>}
                {f.trivia > 0 && <li className="rounded-full bg-white/5 px-3 py-1">🧠 {f.trivia} trivia answer{f.trivia === 1 ? "" : "s"} right</li>}
                {f.streak >= 7 && <li className="rounded-full bg-white/5 px-3 py-1">🔥 {f.streak}-day streak</li>}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">
                None yet — top a weekly Beat Breaker board (🏅), win a month (🏆) or an event (⚡), pass an LA End of Month Exam (🧠) or keep
                a 7-day streak (🔥).
              </p>
            )}
          </div>

          {/* Name colour */}
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-white">Your name on the boards</p>
              <p className="text-sm font-semibold text-white">
                <FanName name={boardName(user.name)} flair={f} />
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Name colour">
              <button
                type="button"
                role="radio"
                aria-checked={!f?.color}
                disabled={saving}
                onClick={() => pick(null)}
                className={`min-h-[40px] rounded-full border px-3 text-xs font-semibold ${!f?.color ? "border-white bg-white/10 text-white" : "border-white/15 text-neutral-300"}`}
              >
                Plain
              </button>
              {flair.colors.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={f?.color === c.key}
                  disabled={saving || !c.unlocked}
                  onClick={() => pick(c.key)}
                  title={c.unlocked ? c.label : `Unlock with ${c.unlock}`}
                  className={`min-h-[40px] rounded-full border px-3 text-xs font-semibold disabled:cursor-not-allowed ${
                    f?.color === c.key ? "border-white bg-white/10" : "border-white/15"
                  } ${c.unlocked ? NAME_COLOR_CLASS[c.key] : "text-neutral-600"}`}
                >
                  {c.unlocked ? c.label : `🔒 ${c.label}`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {flair.colors
                .filter((c) => !c.unlocked)
                .map((c) => `${c.label}: ${c.unlock}`)
                .join(" · ") || "You've unlocked every colour."}
            </p>
          </div>
        </>
      )}
      {!tier && (
        <Link href="/membership" className="mt-5 block text-center text-xs text-neutral-400 hover:text-white">
          💜 Support DMY monthly — a badge, exclusive Pool cues, your name on the wall →
        </Link>
      )}
    </div>
  );
}
