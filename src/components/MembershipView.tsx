"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { startMembership, verifyMembership, type MemberTier, type MembershipPlans } from "@/lib/api";
import { CUE_ORDER, CUES, cueCss } from "@/lib/pool/cues";
import { getFanToken, useFanAuth } from "./FanAuthProvider";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Accra" });
const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400e3));
const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong — try again");

const RING: Record<MemberTier, string> = {
  supporter: "border-accent/60",
  vip: "border-cyan-300/60",
  legend: "border-yellow-400/80 shadow-[0_0_28px_rgba(250,204,21,0.18)]",
};

/**
 * The membership tiers (Free, 💜 Supporter, 💎 VIP, 👑 Legend), the fan's own membership
 * and its renewal, and the thank-you when they come back from paying (?reference=).
 */
export function MembershipView({ plans }: { plans: MembershipPlans | null }) {
  const { user, loading, refreshMe } = useFanAuth();
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const [busy, setBusy] = useState<MemberTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ state: "checking" | "paid" | "failed"; tier?: MemberTier } | null>(reference ? { state: "checking" } : null);

  // Back from Paystack: confirm the payment and show the thank-you
  useEffect(() => {
    if (!reference || loading) return;
    const token = getFanToken();
    if (!token) return;
    verifyMembership(token, reference)
      .then((r) => {
        setResult({ state: r.status === "paid" ? "paid" : "failed", tier: r.tier });
        if (r.status === "paid") void refreshMe();
      })
      .catch(() => setResult({ state: "failed" }));
  }, [reference, loading, refreshMe]);

  async function join(tier: MemberTier) {
    const token = getFanToken();
    if (!token) return;
    setBusy(tier);
    setError(null);
    try {
      window.location.href = (await startMembership(token, tier)).authorizationUrl;
    } catch (err) {
      setError(messageOf(err));
      setBusy(null);
    }
  }

  if (!plans) return <p className="text-center text-sm text-neutral-400">Memberships aren&apos;t available right now — try again in a moment.</p>;
  const mine = user?.member ?? null;
  const tierOf = (k: MemberTier) => plans.tiers.find((t) => t.key === k)!;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {result && (
        <div className={`card p-5 text-center ${result.state === "paid" ? "border-emerald-400/50" : result.state === "failed" ? "border-red-400/40" : ""}`} role="status">
          {result.state === "checking" && <p className="text-sm text-neutral-300">Confirming your payment…</p>}
          {result.state === "paid" && result.tier && (
            <>
              <p className="text-3xl">{tierOf(result.tier).badge}</p>
              <p className="mt-2 font-display text-2xl font-bold text-white">Thank you — you&apos;re a {tierOf(result.tier).label}!</p>
              <p className="mt-1 text-sm text-neutral-300">You&apos;re keeping the games free for everyone. Your badge shows next to your name on every board.</p>
            </>
          )}
          {result.state === "failed" && (
            <p className="text-sm text-red-300">We couldn&apos;t confirm that payment. If you were charged, contact us and we&apos;ll sort it out.</p>
          )}
        </div>
      )}

      {mine && (
        <div className={`card flex flex-wrap items-center justify-between gap-4 border p-5 ${RING[mine.tier]}`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-400">Your membership</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">
              {tierOf(mine.tier).badge} {tierOf(mine.tier).label}
            </p>
            <p className={`text-sm ${daysLeft(mine.until) <= 3 ? "font-semibold text-yellow-300" : "text-neutral-300"}`}>
              Until {day(mine.until)}
              {daysLeft(mine.until) <= 3 ? ` — ends in ${daysLeft(mine.until)} day${daysLeft(mine.until) === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <button type="button" disabled={busy !== null} onClick={() => join(mine.tier)} className="btn-accent min-h-[48px]">
            {busy === mine.tier ? "Opening Paystack…" : `Renew — GH₵${tierOf(mine.tier).priceGhs}`}
          </button>
        </div>
      )}
      {error && <p className="text-center text-sm text-red-300">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex flex-col p-5">
          <p className="font-display text-xl font-bold text-white">Free</p>
          <p className="mt-1 font-display text-3xl font-bold text-white">
            GH₵0<span className="text-sm font-normal text-neutral-400"> / month</span>
          </p>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm text-neutral-300">
            <li>✓ Every game, unlimited</li>
            <li>✓ The leaderboards, prizes and the LA exam</li>
            <li>✓ Pool Night, events, squads</li>
          </ul>
          <p className="mt-4 text-xs text-neutral-500">Always free — that&apos;s the point.</p>
        </div>
        {plans.tiers.map((t) => {
          const current = mine?.tier === t.key;
          return (
            <div key={t.key} className={`card flex flex-col border p-5 ${RING[t.key]}`}>
              <p className="font-display text-xl font-bold text-white">
                {t.badge} {t.label}
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-white">
                GH₵{t.priceGhs}
                <span className="text-sm font-normal text-neutral-400"> / month</span>
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-neutral-300">
                {t.perks.map((p) => (
                  <li key={p}>✓ {p}</li>
                ))}
              </ul>
              {t.key !== "supporter" && (
                <div className="mt-3 flex gap-1.5" aria-label="Exclusive cues">
                  {CUE_ORDER.filter((c) => CUES[c].tier).map((c) => (
                    <span key={c} title={CUES[c].label} className="h-2 flex-1 rounded-full" style={{ background: cueCss(c) }} />
                  ))}
                </div>
              )}
              {user ? (
                <button type="button" disabled={busy !== null} onClick={() => join(t.key)} className={`${current ? "btn-outline" : "btn-accent"} mt-5 min-h-[48px] w-full justify-center`}>
                  {busy === t.key ? "Opening Paystack…" : current ? "Renew" : mine ? `Switch to ${t.label}` : `Become a ${t.label}`}
                </button>
              ) : (
                !loading && (
                  <Link href="/account?next=%2Fmembership" className="btn-accent mt-5 min-h-[48px] w-full justify-center">
                    Sign in to join
                  </Link>
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="card space-y-1.5 p-5 text-sm text-neutral-400">
        <p>
          • Pay with <b className="text-white">Mobile Money or card</b> through Paystack. It&apos;s one month at a time — nothing is charged automatically; we&apos;ll
          remind you a few days before it ends.
        </p>
        <p>• Renewing early adds a month to what you have left. Switching to another tier starts it from today.</p>
        <p>
          • This month&apos;s members are on the <Link href="/community#supporters" className="text-accent-soft underline">Supporter Wall</Link>. Rather give once?{" "}
          <Link href="/support" className="text-accent-soft underline">Tip any amount</Link>.
        </p>
      </div>
    </div>
  );
}
