"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSupporters, initializeDonation } from "@/lib/api";
import { beatLicense } from "@/config/site";
import { useFanAuth } from "./FanAuthProvider";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { useSpotifyPlayer } from "./SpotifyPlayer";

const PRESETS = [10, 20, 50];

// One fetch per page view, shared by every prompt that shows the number.
let supportersPromise: Promise<number | null> | null = null;
function useSupporters() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    supportersPromise ??= getSupporters();
    let live = true;
    supportersPromise.then((v) => live && setN(v));
    return () => {
      live = false;
    };
  }, []);
  return n;
}

/** "23 fans supported this month" — hidden until there's at least one. */
export function SupportersLine({ className = "" }: { className?: string }) {
  const n = useSupporters();
  if (!n) return null;
  return (
    <p className={`inline-flex items-center gap-2 text-sm text-neutral-300 ${className}`}>
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      <span>
        <b className="text-white">{n.toLocaleString()}</b> {n === 1 ? "fan" : "fans"} supported the Yard this month
      </span>
    </p>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card relative max-h-[90dvh] w-full animate-fade-up overflow-y-auto rounded-b-none p-6 sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

/** Tip form — pay what you like through Paystack (cards & Mobile Money). */
export function SupportModal({
  onClose,
  heading = "Support the Yard",
  intro = "Free beats, free games, new music — fans like you keep it going. Every cedi goes straight to Dark Music Yard.",
  context,
}: {
  onClose: () => void;
  heading?: string;
  intro?: string;
  /** Saved with the tip, e.g. "Free beat: Night Drive". */
  context?: string;
}) {
  const { user } = useFanAuth();
  const [amount, setAmount] = useState(20);
  const [custom, setCustom] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEmail((e) => e || user.email);
      setName((n) => n || user.name || "");
    }
  }, [user]);

  const value = custom ? Number(custom) : amount;

  async function pay() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter your email for the receipt.");
      return;
    }
    if (!Number.isFinite(value) || value < 1) {
      setError("Enter at least GH₵1.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { authorizationUrl } = await initializeDonation({ email, name, amountGhs: value, message: context });
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the payment");
      setBusy(false);
    }
  }

  return (
    <Modal title={heading} onClose={onClose}>
      <p className="eyebrow">
        <span className="h-px w-6 bg-accent" /> ❤ Tip jar
      </p>
      <h2 className="mt-2 pr-10 font-display text-2xl font-bold text-white">{heading}</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">{intro}</p>
      <SupportersLine className="mt-3" />

      <div className="mt-5 grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setAmount(p);
              setCustom("");
            }}
            className={`min-h-[48px] rounded-xl border text-base font-bold transition ${
              !custom && amount === p ? "border-accent bg-accent text-white" : "border-white/10 text-neutral-200 hover:border-accent"
            }`}
          >
            GH₵{p}
          </button>
        ))}
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        placeholder="Or another amount (GH₵)"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        className="input mt-2"
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="email"
          placeholder="Email for the receipt"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          autoComplete="email"
        />
        <input
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          autoComplete="name"
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <button type="button" onClick={pay} disabled={busy} className="btn-accent mt-4 min-h-[52px] w-full text-base">
        {busy ? "Opening checkout…" : `Support with GH₵${Number.isFinite(value) && value > 0 ? value : 0}`}
      </button>
      <p className="mt-2 text-center text-xs text-neutral-500">Paystack · cards &amp; Mobile Money (MTN, Telecel, AirtelTigo)</p>
    </Modal>
  );
}

/**
 * Free MP3 download: the download starts straight away, and a small "enjoying
 * it?" tip prompt opens alongside — never in the way of the free file.
 */
export function FreeDownloadButton({ href, title, className = "" }: { href: string; title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a href={href} onClick={() => setTimeout(() => setOpen(true), 400)} className={className}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Free MP3
      </a>
      {open && (
        <SupportModal
          onClose={() => setOpen(false)}
          heading="Your download has started"
          intro={`Enjoy “${title}”. It's free — and if it helps your music, a small tip keeps the free beats coming.`}
          context={`Tip after downloading the free beat: ${title}`}
        />
      )}
    </>
  );
}

/** One "License" link per beat instead of the full legal text under every card. */
export function LicenseButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        License
      </button>
      {open && (
        <Modal title="Free beat license" onClose={() => setOpen(false)}>
          <p className="eyebrow">
            <span className="h-px w-6 bg-accent" /> License
          </p>
          <h2 className="mt-2 pr-10 font-display text-2xl font-bold text-white">Using a DMY free beat</h2>
          <ul className="mt-4 space-y-2 text-sm text-neutral-300">
            <li>✓ Record and release songs on this beat on approved streaming platforms</li>
            <li>✗ No Content ID registration, copyright claims or strikes</li>
            <li>✗ Downloading doesn&apos;t transfer ownership of the beat</li>
          </ul>
          <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-neutral-400">
            {beatLicense}
          </p>
        </Modal>
      )}
    </>
  );
}

/** Floating "Support the Yard" pill (bottom-right), kept clear of the players. */
export function SupportFab() {
  const [open, setOpen] = useState(false);
  const { current } = useAudioPlayer();
  const { activeId } = useSpotifyPlayer();
  const playerOpen = Boolean(current || activeId);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed right-3 z-[44] inline-flex min-h-[48px] items-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-white shadow-glow transition-all hover:scale-105 sm:right-5 ${
          playerOpen ? "bottom-[6.75rem]" : "bottom-4 sm:bottom-6"
        }`}
      >
        <span aria-hidden>❤</span> Support the Yard
      </button>
      {open && <SupportModal onClose={() => setOpen(false)} context="Tip via the Support the Yard button" />}
    </>
  );
}

/** Inline call-to-action card (Free Beats page header area). */
export function SupportCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <p className="font-display text-xl font-bold text-white">These beats are free because fans chip in</p>
          <p className="mt-1 text-sm text-neutral-400">
            Download whatever you need. If a beat helps your music, tip what you can — it funds the next pack.
          </p>
          <SupportersLine className="mt-2" />
        </div>
        <button type="button" onClick={() => setOpen(true)} className="btn-accent min-h-[48px]">
          ❤ Support the Yard
        </button>
      </div>
      {open && <SupportModal onClose={() => setOpen(false)} context="Tip via the Free Beats page" />}
    </div>
  );
}
