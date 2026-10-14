"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buyLiveTicket, getLiveShow, verifyLiveTicket, watchLiveShow, type LiveShow } from "@/lib/api";
import { calendarLink } from "@/lib/live";
import { site } from "@/config/site";
import { useFanAuth, getFanToken } from "./FanAuthProvider";
import { YouTubeEmbed } from "./YouTubeEmbed";

function countdown(ms: number) {
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/**
 * Buy-a-ticket / watch panel for one live show. After paying, the ticket is
 * tied to the fan's account, and the stream (and replay) plays right here.
 */
export function LiveTicketPanel({ initial }: { initial: LiveShow }) {
  const { user, loading: authLoading } = useFanAuth();
  const [show, setShow] = useState<LiveShow>(initial);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamNote, setStreamNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // The signed-in view (do I have a ticket?), plus confirming a payment on return from Paystack.
  const refresh = useCallback(async () => {
    const token = getFanToken();
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (params.get("ticket") && reference) {
      try {
        const verified = await verifyLiveTicket(token, initial.slug, reference);
        setShow(verified);
        setNotice(verified.hasTicket ? "✓ Payment received — you're in! Your ticket is saved to your account." : null);
        if (!verified.hasTicket) setError("The payment wasn't completed. You can try again below.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't confirm the payment");
      } finally {
        window.history.replaceState({}, "", `/live/${initial.slug}`);
      }
      return;
    }
    const fresh = await getLiveShow(initial.slug, token);
    if (fresh) setShow(fresh);
  }, [initial.slug]);

  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, user?.id, refresh]);

  // Ticket holders: fetch the stream link when it's watchable (and re-check while waiting for the start).
  useEffect(() => {
    const token = getFanToken();
    if (!token || !show.hasTicket) return;
    let live = true;
    const load = async () => {
      try {
        const r = await watchLiveShow(token, show.slug);
        if (!live) return;
        setStreamUrl(r.streamUrl);
        setStreamNote(null);
      } catch (err) {
        if (live) setStreamNote(err instanceof Error ? err.message : null);
      }
    };
    void load();
    const id = setInterval(() => {
      if (!streamUrl) void load();
    }, 60000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [show.hasTicket, show.slug, streamUrl]);

  async function buy() {
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { authorizationUrl } = await buyLiveTicket(token, show.slug);
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the payment");
      setBusy(false);
    }
  }

  const startsIn = now === null ? null : countdown(new Date(show.startsAt).getTime() - now);
  const pageUrl = `${site.url}/live/${show.slug}`;

  return (
    <div className="space-y-4">
      {notice && <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-white">{notice}</p>}

      {/* The player — ticket holders only */}
      {show.hasTicket && streamUrl && (
        <div className="overflow-hidden rounded-2xl shadow-glow">
          <YouTubeEmbed url={streamUrl} title={`${show.title} — live`} />
        </div>
      )}

      <div className="card p-5">
        {show.status === "upcoming" && startsIn && (
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">Starts in</p>
            <p className="font-display text-3xl font-bold tabular-nums text-white">{startsIn}</p>
          </div>
        )}
        {show.status === "live" && (
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-glow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live now
          </p>
        )}

        {show.hasTicket ? (
          <div>
            <p className="font-semibold text-white">🎟️ You have a ticket</p>
            <p className="mt-1 text-sm text-neutral-400">
              {streamUrl
                ? show.status === "ended"
                  ? "Watch the replay above."
                  : show.status === "live"
                  ? "Enjoy the show — it's playing above."
                  : "Your stream is ready above — it goes live at showtime."
                : streamNote || "The stream appears here when the show starts. Keep this page open or come back at showtime."}
            </p>
            {show.status === "upcoming" && (
              <a
                href={calendarLink(show.title, show.startsAt, show.durationMins, pageUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline mt-4 min-h-[44px]"
              >
                Add to calendar
              </a>
            )}
          </div>
        ) : !show.onSale ? (
          <p className="text-sm text-neutral-400">This show has ended and there&apos;s no replay.</p>
        ) : !user ? (
          <div>
            <p className="text-sm text-neutral-300">
              Sign in (or create a free account) to buy a ticket — it&apos;s saved to your account so you can watch on any device.
            </p>
            <Link href="/account" className="btn-accent mt-4 min-h-[52px] w-full text-base">
              Sign in to get a ticket — GH₵{show.priceGhs}
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-neutral-300">
              One payment: the live stream{show.replay ? " and the replay afterwards" : ""}.
            </p>
            <button type="button" onClick={buy} disabled={busy} className="btn-accent mt-4 min-h-[52px] w-full text-base">
              {busy ? "Opening checkout…" : `${show.status === "ended" ? "Watch the replay" : "Buy ticket"} — GH₵${show.priceGhs}`}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
