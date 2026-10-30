"use client";

import Link from "next/link";
import { useState } from "react";
import { setCueDesign, type CueDesign } from "@/lib/api";
import { CUE_ORDER, CUES, cueCss } from "@/lib/pool/cues";
import { getFanToken, useFanAuth } from "../../FanAuthProvider";

/** "Your cue": the classic for everyone; the exclusive designs for 💎 VIPs and 👑 Legends. */
export function CuePicker() {
  const { user, refreshMe } = useFanAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;
  const tier = user.member?.tier ?? null;
  const canUse = (c: CueDesign) => CUES[c].tier === null || tier === "vip" || tier === "legend";
  const current = user.cueDesign ?? "classic";

  async function pick(c: CueDesign) {
    const token = getFanToken();
    if (!token || c === current) return;
    setBusy(true);
    setError(null);
    try {
      await setCueDesign(token, c);
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change your cue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-white">Your cue</p>
        {!canUse("gold") && (
          <Link href="/membership" className="text-xs font-semibold text-accent-soft hover:text-white">
            💎 Exclusive cues with VIP →
          </Link>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CUE_ORDER.map((c) => {
          const open = canUse(c);
          const chosen = current === c;
          return open ? (
            <button
              key={c}
              type="button"
              disabled={busy}
              onClick={() => pick(c)}
              aria-pressed={chosen}
              className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-3 text-left text-sm transition ${
                chosen ? "border-accent bg-accent/15 text-white" : "border-white/10 text-neutral-200 hover:border-accent/60"
              }`}
            >
              <span className="h-2.5 flex-1 rounded-full" style={{ background: cueCss(c), boxShadow: CUES[c].glow ? `0 0 10px ${CUES[c].glow}` : undefined }} />
              <span className="w-28 shrink-0">
                {CUES[c].label}
                {chosen && " ✓"}
              </span>
            </button>
          ) : (
            <Link
              key={c}
              href="/membership"
              className="flex min-h-[48px] items-center gap-3 rounded-xl border border-white/[0.06] px-3 text-sm text-neutral-500 transition hover:border-cyan-300/50"
              title="For VIPs and Legends"
            >
              <span className="h-2.5 flex-1 rounded-full opacity-40" style={{ background: cueCss(c) }} />
              <span className="w-28 shrink-0">💎 {CUES[c].label}</span>
            </Link>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
