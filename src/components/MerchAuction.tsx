"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { getAuction, placeBid, payAuction, type AuctionState, type Merch } from "@/lib/api";
import { useFanAuth, getFanToken } from "./FanAuthProvider";

const POLL_MS = 10_000;
const FAST_POLL_MS = 3_000;
const ghs = (n: number) => `GH₵${n.toLocaleString("en-US")}`;

function timeLeft(ms: number): string {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Live bidding panel for a merch item that's sold by auction. */
export function MerchAuction({ product }: { product: Merch }) {
  const { user } = useFanAuth();
  const [state, setState] = useState<AuctionState | null>(
    product.auction ? { auction: product.auction, bids: [], you: null } : null
  );
  // null until mounted, so the server-rendered HTML never contains a clock reading.
  const [now, setNow] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [size, setSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await getAuction(product.slug, getFanToken()));
    } catch {
      /* keep showing the last state; the next poll retries */
    }
  }, [product.slug]);

  // Near-real-time: poll every 10s, every 3s in the final 10 minutes, and
  // straight away whenever the tab comes back into view.
  const endsAtRef = useRef<number>(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const loop = async () => {
      if (!document.hidden) await refresh();
      if (stopped) return;
      const left = endsAtRef.current - Date.now();
      timer = setTimeout(loop, left > 0 && left < 10 * 60000 ? FAST_POLL_MS : POLL_MS);
    };
    void loop();
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh, user?.id]);

  // 1s clock for the countdown.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const a = state?.auction;
  const endsAt = a ? new Date(a.endsAt).getTime() : 0;
  endsAtRef.current = endsAt;
  const live = Boolean(a && a.status === "live" && (now === null || endsAt > now));

  // When the clock runs out, fetch the result straight away.
  useEffect(() => {
    if (now !== null && a?.status === "live" && endsAt <= now) void refresh();
  }, [a?.status, endsAt, now, refresh]);

  // Keep the suggested bid at least the minimum.
  useEffect(() => {
    if (!a) return;
    setAmount((cur) => (Number(cur) >= a.minNextBidGhs ? cur : String(a.minNextBidGhs)));
  }, [a?.minNextBidGhs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!a) return null;
  const you = state?.you;
  // A worn-on-set piece is a single item in one size; shop auctions ask for yours.
  const needsSize = product.sizes.length > 0 && product.kind !== "worn";

  async function bid(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token || !a) return;
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value < a.minNextBidGhs) {
      setError(`Bid at least ${ghs(a.minNextBidGhs)}`);
      return;
    }
    if (needsSize && !size) {
      setError("Choose your size first.");
      return;
    }
    if (!confirm(`Place a bid of ${ghs(value)} on ${product.name}? If you win, you'll need to pay it.`)) return;
    setBusy(true);
    setError(null);
    try {
      const next = await placeBid(token, product.slug, value, size || undefined);
      setState(next);
      setNotice(`You're the highest bidder at ${ghs(value)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bid failed");
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { authorizationUrl } = await payAuction(token, product.slug);
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the payment");
      setBusy(false);
    }
  }

  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(255,31,61,0.16),transparent)]" />
      <div className="relative">
        {/* Status + countdown */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {live ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-glow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live · updates automatically
            </span>
          ) : (
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neutral-300">
              {a.status === "sold" ? "Sold at auction" : a.status === "unsold" ? "Ended · unsold" : "Auction ended"}
            </span>
          )}
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">{live ? "Ends in" : "Ended"}</p>
            <p
              className={`font-display text-xl font-bold tabular-nums ${
                live && now !== null && endsAt - now < 3600_000 ? "text-accent" : "text-white"
              }`}
            >
              {now === null
                ? "—"
                : live
                ? timeLeft(endsAt - now)
                : new Date(a.endsAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Current bid */}
        <div className="mt-5">
          <p className="text-xs text-neutral-400">{a.highBidGhs != null ? (live ? "Current bid" : "Winning bid") : "Starting bid"}</p>
          <p className="font-display text-4xl font-bold text-white">{ghs(a.highBidGhs ?? a.startingBidGhs)}</p>
          <p className="mt-1 text-sm text-neutral-400">
            {a.bidCount} bid{a.bidCount === 1 ? "" : "s"}
            {a.leader && (
              <>
                {" · "}
                {you?.leading || you?.won ? (
                  <span className="font-semibold text-accent">{live ? "You're winning" : "You won"}</span>
                ) : (
                  <>
                    {live ? "leading:" : "winner:"} <span className="text-neutral-200">{a.leader}</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>

        {/* Bidding */}
        {live && (
          <div className="mt-5 border-t border-white/[0.06] pt-5">
            {!user ? (
              <p className="text-sm text-neutral-300">
                <Link href="/account" className="font-semibold text-accent hover:underline">
                  Sign in or create a free account
                </Link>{" "}
                to bid.
              </p>
            ) : !user.emailVerified ? (
              <p className="text-sm text-neutral-300">
                Confirm your email address to bid — check your inbox, or{" "}
                <Link href="/account" className="font-semibold text-accent hover:underline">
                  resend it from your account
                </Link>
                .
              </p>
            ) : you?.leading ? (
              <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-white">
                ✓ You&apos;re the highest bidder. If someone outbids you, we&apos;ll email you and tell you here.
              </p>
            ) : (
              <form onSubmit={bid} className="space-y-4">
                {you?.myBestBidGhs != null && (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-200">
                    You&apos;ve been outbid (your best: {ghs(you.myBestBidGhs)}). Bid again to take the lead.
                  </p>
                )}
                {needsSize && (
                  <div>
                    <p className="label">Your size</p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          className={`min-w-12 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            size === s ? "border-accent bg-accent text-white" : "border-ink-600 text-neutral-200 hover:border-accent"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="bid-amount">
                    Your bid (minimum {ghs(a.minNextBidGhs)})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-[9rem] flex-1">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">GH₵</span>
                      <input
                        id="bid-amount"
                        type="number"
                        inputMode="numeric"
                        min={a.minNextBidGhs}
                        step={1}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="input pl-14 text-lg font-semibold"
                      />
                    </div>
                    <button type="submit" disabled={busy} className="btn-accent">
                      {busy ? "Placing…" : "Place bid"}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1, 2, 5].map((k) => {
                      const v = a.minNextBidGhs + a.minIncrementGhs * (k - 1);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setAmount(String(v))}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-neutral-300 transition hover:border-accent/60 hover:text-white"
                        >
                          {ghs(v)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Result */}
        {!live && (
          <div className="mt-5 border-t border-white/[0.06] pt-5">
            {you?.won && !you.paid ? (
              <div className="rounded-2xl border border-accent/50 bg-accent/10 p-4">
                <p className="font-display text-2xl font-bold text-white">🎉 You won!</p>
                <p className="mt-1 text-sm text-neutral-200">
                  {product.name}
                  {you.size ? ` (size ${you.size})` : ""} is yours for {ghs(a.highBidGhs ?? 0)}.
                </p>
                {you.payBy && (
                  <p className="mt-2 text-sm text-white">
                    Pay by{" "}
                    <b>
                      {new Date(you.payBy).toLocaleString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Africa/Accra",
                      })}
                    </b>
                    {now !== null && new Date(you.payBy).getTime() > now && (
                      <span className="text-neutral-300"> · {timeLeft(new Date(you.payBy).getTime() - now)} left</span>
                    )}
                  </p>
                )}
                <button type="button" onClick={pay} disabled={busy} className="btn-accent mt-4 min-h-[52px] w-full text-base">
                  {busy ? "Opening checkout…" : `Pay ${ghs(a.highBidGhs ?? 0)} — Mobile Money or card`}
                </button>
                <p className="mt-2 text-xs text-neutral-400">
                  If it isn&apos;t paid in time, it goes to the next highest bidder.
                </p>
              </div>
            ) : you?.paid ? (
              <p className="text-sm text-white">✓ Paid — we&apos;ll email you to arrange delivery.</p>
            ) : you?.lapsed ? (
              <p className="text-sm text-neutral-300">
                Your payment window closed, so this piece went to the next bidder. Keep an eye out for the next drop.
              </p>
            ) : a.status === "unsold" ? (
              <p className="text-sm text-neutral-400">This piece didn&apos;t sell — it may be relisted soon.</p>
            ) : a.highBidGhs == null ? (
              <p className="text-sm text-neutral-400">This auction ended with no bids.</p>
            ) : (
              <p className="text-sm text-neutral-400">
                {a.status === "sold" ? "Sold to" : "Won by"} {a.leader} for {ghs(a.highBidGhs)}.
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {notice && !error && live && <p className="mt-3 text-sm font-semibold text-white">✓ {notice}</p>}

        {/* History */}
        {state && state.bids.length > 0 && (
          <div className="mt-6">
            <p className="label">Bid history</p>
            <ul className="max-h-56 space-y-1.5 overflow-auto pr-1">
              {state.bids.map((b, i) => (
                <li
                  key={`${b.at}-${i}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    b.mine ? "bg-accent/10 text-white" : "bg-white/[0.02] text-neutral-300"
                  }`}
                >
                  <span>
                    {b.mine ? "You" : b.name}
                    {i === 0 && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-accent">Top</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500">{ago(b.at)}</span>
                    <span className="font-semibold tabular-nums">{ghs(b.amountGhs)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-5 text-xs leading-relaxed text-neutral-500">
          Bids are binding. When the clock runs out, the highest bidder has {a.payWindowHours ?? 48} hours to pay
          (Mobile Money or card) — otherwise it&apos;s offered to the next highest bidder. A bid in the last 2 minutes
          adds 2 minutes to the clock, so nobody can snipe it.
        </p>
      </div>
    </div>
  );
}
