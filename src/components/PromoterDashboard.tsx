"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useFanAuth, getFanToken } from "./FanAuthProvider";
import {
  getPromoter,
  sendPromoterCode,
  verifyPromoterCode,
  submitGhanaCard,
  setPromoterPayout,
  type MomoNetwork,
  type PromoTier,
  type PromoterView,
} from "@/lib/api";
import { site, whatsappLink } from "@/config/site";

const ghs = (n: number) => `GH₵${n.toLocaleString("en-US")}`;
const num = (n: number) => n.toLocaleString("en-US");
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const NETWORKS: MomoNetwork[] = ["MTN", "Telecel", "AirtelTigo"];
const DEFAULT_TIERS: PromoTier[] = [
  { clicks: 3000, ghs: 400 },
  { clicks: 1000, ghs: 50 },
];

/** The Lenko Army promoter program: confirm your phone, send your Ghana Card, share your link, watch the clicks add up. */
export function PromoterDashboard() {
  const { user, loading } = useFanAuth();
  const [v, setV] = useState<PromoterView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getFanToken();
    if (!token) return;
    try {
      setV(await getPromoter(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your promoter dashboard");
    }
  }, []);
  useEffect(() => {
    if (user) void load();
  }, [user?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live: the count refreshes every 20 s while the page is open.
  const live = Boolean(v?.promoter);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => document.visibilityState === "visible" && void load(), 20_000);
    return () => clearInterval(id);
  }, [live, load]);

  const tiers = [...(v?.program.tiers ?? DEFAULT_TIERS)].sort((a, b) => a.clicks - b.clicks);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {tiers.map((t) => (
          <div key={t.clicks} className="rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.06] p-4 text-center">
            <p className="font-display text-3xl font-bold text-yellow-300">{ghs(t.ghs)}</p>
            <p className="mt-1 text-sm text-neutral-300">{num(t.clicks)} clicks in a month</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="card p-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : !user ? (
        <div className="card p-6 text-center">
          <p className="font-semibold text-white">Get your own link</p>
          <p className="mt-1 text-sm text-neutral-400">Sign in (or join the Lenko Army — it&apos;s free) to get your promoter link and start counting.</p>
          <Link href={`/account?next=${encodeURIComponent("/community/promote")}`} className="btn-accent mt-4 inline-flex min-h-[48px]">
            Sign in to start →
          </Link>
        </div>
      ) : error && !v ? (
        <p className="card p-6 text-center text-sm text-red-300">{error}</p>
      ) : !v ? (
        <p className="card p-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : !v.promoter ? (
        <>
          <PhoneCheck v={v} onChange={setV} />
          <GhanaCard v={v} onChange={setV} />
        </>
      ) : (
        <>
          {v.promoter.phone && v.promoter.card?.status === "approved" ? (
            <p className="text-sm font-semibold text-emerald-300">📱 Phone confirmed ✓ · 🪪 Ghana Card verified ✓ · your rewards are switched on</p>
          ) : (
            <>
              {v.promoter.phone ? (
                <p className="text-sm font-semibold text-emerald-300">📱 Phone {v.promoter.phone} confirmed ✓</p>
              ) : (
                <PhoneCheck v={v} onChange={setV} />
              )}
              {v.promoter.card?.status === "approved" ? (
                <p className="text-sm font-semibold text-emerald-300">🪪 Ghana Card verified ✓</p>
              ) : (
                <GhanaCard v={v} onChange={setV} />
              )}
              <p className="text-xs text-neutral-400">Your link already counts — rewards are paid once your phone is confirmed and your Ghana Card is approved.</p>
            </>
          )}
          {v.promoter.status === "disqualified" && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
              <p className="font-semibold text-white">Your account can&apos;t earn rewards right now</p>
              <p className="mt-1">{v.promoter.reason}. One person, one account — every account involved is disqualified until DMY checks it.</p>
              <p className="mt-1 text-red-200/80">
                Is this a mistake (e.g. you share a phone with family)?{" "}
                {site.contact.whatsapp ? (
                  <a href={whatsappLink(`Hi DMY — my Lenko Army promoter account (${v.code}) was disqualified: "${v.promoter.reason}".`)} className="font-semibold underline">
                    Message DMY on WhatsApp
                  </a>
                ) : (
                  <a href={`mailto:${site.contact.email}`} className="font-semibold underline">
                    Email DMY
                  </a>
                )}
                .
              </p>
            </div>
          )}
          {!v.program.open && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-300">⏸ The program is paused — clicks aren&apos;t being counted right now.</p>
          )}
          <Counter v={v} tiers={tiers} />
          <ShareLink code={v.code} />
          <Payout v={v} onChange={setV} />
          {v.history.length > 0 && <History v={v} />}
        </>
      )}

      <Rules ipCap={v?.program.ipDailyCap ?? 10} tiers={tiers} />
    </div>
  );
}

function Counter({ v, tiers }: { v: PromoterView; tiers: PromoTier[] }) {
  const clicks = v.month.clicks;
  const top = tiers[tiers.length - 1];
  const next = tiers.find((t) => clicks < t.clicks) ?? null;
  const reached = [...tiers].reverse().find((t) => clicks >= t.clicks) ?? null;
  const pct = Math.min(100, (clicks / top.clicks) * 100);
  const days = Math.max(0, Math.ceil((Date.parse(v.month.endsAt) - Date.now()) / 86400e3));
  return (
    <div className="card overflow-hidden">
      <div className="relative p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_0%_0%,rgba(191,0,255,0.22),transparent_60%)]" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden /> Live · {monthName(v.month.month)}
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl" aria-live="polite">
            {num(clicks)} <span className="text-2xl text-neutral-400 sm:text-3xl">/ {num(next?.clicks ?? top.clicks)} clicks</span>
          </p>
          <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-yellow-400 transition-[width] duration-700" style={{ width: `${pct}%` }} />
            {tiers.slice(0, -1).map((t) => (
              <span key={t.clicks} aria-hidden className="absolute inset-y-0 w-0.5 bg-white/70" style={{ left: `${(t.clicks / top.clicks) * 100}%` }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-neutral-500">
            <span>0</span>
            {tiers.map((t) => (
              <span key={t.clicks}>
                {num(t.clicks)} · {ghs(t.ghs)}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-white">
            {reached ? <b className="text-yellow-300">{ghs(reached.ghs)} reached ✓ </b> : null}
            {next ? (
              <>
                {reached ? "— " : ""}
                <b>{num(next.clicks - clicks)}</b> more for {ghs(next.ghs)}
              </>
            ) : (
              "— the top reward. Legend."
            )}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {days} day{days === 1 ? "" : "s"} left · the count starts again on the 1st · updates every 20 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

function ShareLink({ code }: { code: string }) {
  const link = `${site.url}/r/${code}`;
  const text = `Lenko Psycho's videos on YouTube 🧠🖤 Watch, like, subscribe and turn on notifications: ${link}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the link is on screen to copy by hand */
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: "Lenko Psycho on YouTube", text, url: link });
    } catch {
      /* closed the share sheet */
    }
  };
  return (
    <div className="card p-5">
      <p className="font-semibold text-white">Your link</p>
      <p className="mt-1 text-sm text-neutral-400">It takes people to one of Lenko&apos;s videos on YouTube. Every person who opens it counts once a month.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white">{link}</code>
        <button type="button" onClick={copy} className="btn-accent min-h-[44px] text-sm">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[40px]">
          WhatsApp
        </a>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[40px]">
          X
        </a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[40px]">
          Facebook
        </a>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button type="button" onClick={share} className="btn-outline min-h-[40px]">
            More…
          </button>
        )}
      </div>
    </div>
  );
}

function PhoneCheck({ v, onChange }: { v: PromoterView; onChange: (v: PromoterView) => void }) {
  const [phone, setPhone] = useState(v.profilePhone ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const waiting = Boolean(v.pendingCode) && !changing;

  async function run(fn: (token: string) => Promise<PromoterView>) {
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await fn(token));
      setChanging(false);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  const send = (e?: FormEvent) => {
    e?.preventDefault();
    void run((t) => sendPromoterCode(t, phone));
  };
  const confirm = (e: FormEvent) => {
    e.preventDefault();
    void run((t) => verifyPromoterCode(t, code));
  };

  if (!v.program.smsReady) {
    return (
      <div className="card p-6 text-center">
        <p className="font-semibold text-white">Phone checks are switching on soon</p>
        <p className="mt-1 text-sm text-neutral-400">Rewards need your phone confirmed by text as well as your Ghana Card. Check back shortly.</p>
      </div>
    );
  }
  return (
    <div className="card p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Step 1 · Confirm your phone</p>
      <p className="mt-2 text-sm text-neutral-300">
        We text a 6-digit code to your number. Use your own — <b className="text-white">a number can only be confirmed on one account</b>.
      </p>
      {!waiting ? (
        <form onSubmit={send} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-xs text-neutral-400">
            Your mobile number
            <input
              className="input mt-1 text-base"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="024 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={busy} className="btn-accent min-h-[48px]">
            {busy ? "Sending…" : "Text me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirm} className="mt-4">
          <p className="text-sm text-white">
            Code sent to <b>{v.pendingCode!.phone}</b> — it lasts 10 minutes.
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input
              className="input w-40 text-center font-display text-2xl tracking-[0.3em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-label="The 6-digit code"
              required
            />
            <button type="submit" disabled={busy || code.length !== 6} className="btn-accent min-h-[48px]">
              {busy ? "Checking…" : "Confirm"}
            </button>
          </div>
          <div className="mt-3 flex gap-4 text-xs">
            <button type="button" disabled={busy} onClick={() => send()} className="text-accent hover:underline">
              Send it again
            </button>
            <button type="button" onClick={() => setChanging(true)} className="text-neutral-400 hover:text-white">
              Use another number
            </button>
          </div>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}

function GhanaCard({ v, onChange }: { v: PromoterView; onChange: (v: PromoterView) => void }) {
  const card = v.promoter?.card ?? null;
  const [number, setNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resend, setResend] = useState(false);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token || !photo) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await submitGhanaCard(token, number, photo));
      setResend(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send it — try again");
    } finally {
      setBusy(false);
    }
  }

  if (!v.program.cardReady) {
    return (
      <div className="card p-6 text-center">
        <p className="font-semibold text-white">Ghana Card checks are switching on soon</p>
        <p className="mt-1 text-sm text-neutral-400">Rewards need your Ghana Card as well as your phone. Check back shortly.</p>
      </div>
    );
  }
  if (card?.status === "pending" && !resend) {
    return (
      <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-4 text-sm text-yellow-50">
        <p className="font-semibold text-white">🪪 Your Ghana Card ({card.masked}) is being checked</p>
        <p className="mt-1">Usually within a day. Your link already counts — rewards are paid once it&apos;s approved.</p>
        <button type="button" onClick={() => setResend(true)} className="mt-2 text-xs font-semibold text-yellow-300 hover:underline">
          Sent the wrong photo? Send it again
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={send} className="card p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">{card ? "Your Ghana Card" : "Step 2 · Your Ghana Card"}</p>
      {card?.status === "rejected" && (
        <p className="mt-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
          We couldn&apos;t approve the card you sent: <b>{card.note}</b>. Please send it again.
        </p>
      )}
      <p className="mt-2 text-sm text-neutral-300">
        Rewards are for fans in Ghana, one per person. <b className="text-white">One Ghana Card, one account</b> — and accounts that share a phone number,
        a phone or computer, or a Mobile Money number are all disqualified from rewards.
      </p>
      <label className="mt-4 block text-xs text-neutral-400">
        Ghana Card number
        <input
          className="input mt-1 font-mono text-base uppercase tracking-wider"
          placeholder="GHA-123456789-0"
          autoComplete="off"
          value={number}
          onChange={(e) => setNumber(e.target.value.toUpperCase())}
          maxLength={20}
          required
        />
      </label>
      <label className="mt-3 block text-xs text-neutral-400">
        Photo of the front of the card
        <input
          className="mt-1 block w-full text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-600 file:px-3 file:py-2 file:text-sm file:text-neutral-100"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setPhoto(f);
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
          required
        />
      </label>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Your Ghana Card photo" className="mt-3 max-h-48 rounded-xl border border-white/10 object-contain" />
      )}
      <p className="mt-2 text-xs text-neutral-500">
        Flat, in good light, all four corners in the picture, no glare. Only DMY sees it, to check it&apos;s you — the photo is deleted once checked, and we
        keep only a coded copy of the number so it can&apos;t be used on another account.
      </p>
      <button type="submit" disabled={busy || !photo} className="btn-accent mt-4 min-h-[48px] w-full justify-center sm:w-auto">
        {busy ? "Sending…" : "Send my Ghana Card"}
      </button>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </form>
  );
}

function Payout({ v, onChange }: { v: PromoterView; onChange: (v: PromoterView) => void }) {
  const saved = v.promoter?.momo ?? null;
  const [editing, setEditing] = useState(!saved);
  const [form, setForm] = useState<{ network: MomoNetwork; number: string; accountName: string }>({ network: saved?.network ?? "MTN", number: "", accountName: saved?.accountName ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await setPromoterPayout(token, form));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save it");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-white">Where we pay you</p>
        {saved && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-accent hover:underline">
            Change
          </button>
        )}
      </div>
      {saved && !editing ? (
        <p className="mt-2 text-sm text-neutral-300">
          {saved.network} Mobile Money · <b className="text-white">{saved.number}</b> · {saved.accountName}
        </p>
      ) : (
        <form onSubmit={save} className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr]">
          <select className="input" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value as MomoNetwork })} aria-label="Network">
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <input className="input" type="tel" inputMode="tel" placeholder="Mobile Money number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
          <input
            className="input sm:col-span-2"
            placeholder="Name on the Mobile Money account"
            value={form.accountName}
            onChange={(e) => setForm({ ...form, accountName: e.target.value })}
            required
          />
          <button type="submit" disabled={busy} className="btn-accent min-h-[44px] sm:col-span-2">
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      )}
      <p className="mt-2 text-xs text-neutral-500">Rewards are paid here after the month ends. It must be your own number — the same one on two accounts disqualifies both.</p>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}

function History({ v }: { v: PromoterView }) {
  return (
    <div className="card p-5">
      <p className="font-semibold text-white">Past months</p>
      <ul className="mt-2 divide-y divide-white/[0.05] text-sm">
        {v.history.map((h) => (
          <li key={h.month} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span>
              <span className="text-neutral-400">{monthName(h.month)}</span> · <b className="text-white">{num(h.clicks)}</b> clicks
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                h.paidAt ? "bg-emerald-500/15 text-emerald-300" : h.rewardGhs > 0 ? "bg-yellow-400/15 text-yellow-300" : "bg-white/5 text-neutral-400"
              }`}
            >
              {h.paidAt ? `${ghs(h.rewardGhs)} paid ✓` : h.rewardGhs > 0 ? `${ghs(h.rewardGhs)} · payment coming` : "No reward"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Rules({ ipCap, tiers }: { ipCap: number; tiers: PromoTier[] }) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">How it works</h2>
      <ol className="mt-3 space-y-2 text-sm text-neutral-300">
        <li>
          1. Every Lenko Army member gets one link. Confirm your phone by text and send your Ghana Card — your link counts from the first of the two, and rewards are
          for fans in Ghana for now.
        </li>
        <li>2. Share it anywhere — it takes people to Lenko Psycho&apos;s videos on YouTube (It&apos;s Working, Shiver, Dream Big, Ready).</li>
        <li>
          3. Each person who opens your link counts <b className="text-white">once a month</b>. Your own clicks, link previews and bots don&apos;t count, and at
          most {ipCap} a day count from one internet connection.
        </li>
        <li>
          4. Counts start again on the 1st of every month (Ghana time). Reach {tiers.map((t) => `${num(t.clicks)} for ${ghs(t.ghs)}`).join(", or ")} — you get
          the higher reward you reach, not both.
        </li>
        <li>
          5. After the month ends DMY checks every account and pays rewards to your Mobile Money — once your phone is confirmed and your Ghana Card is approved.
          You get a text when it&apos;s sent.
        </li>
        <li>
          6. One person, one account: one Ghana Card and one phone number per account. Buying clicks, bots or more than one account means no reward for any of
          the accounts.
        </li>
      </ol>
    </div>
  );
}
