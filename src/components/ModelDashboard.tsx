"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getFanToken } from "./FanAuthProvider";
import { Star } from "./StarRating";
import { BookingFacts, BookingStatusPill, ContactBlock } from "./BookingBits";
import {
  getMyModel,
  respondToBooking,
  updateMyModel,
  type MyModelData,
  type MyModelProfile,
  type ModelSideBooking,
} from "@/lib/api";
import { MODELS_MARKET, MODEL_CATEGORIES, formatWhen, ghs } from "@/lib/modelsMarket";

const PROFILE_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Waiting for review", className: "bg-amber-500/15 text-amber-300" },
  approved: { label: "Live", className: "bg-accent text-white" },
  rejected: { label: "Not approved", className: "bg-red-500/15 text-red-300" },
};

/** A registered model's bookings, earnings and editable details. Hidden for non-models. */
export function ModelDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<MyModelData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => {
    const token = getFanToken();
    if (token) setData(await getMyModel(token));
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function respond(
    id: string,
    action: "accept" | "decline" | "complete",
    extra: { priceGhs?: number; reason?: string } = {}
  ) {
    const token = getFanToken();
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await respondToBooking(token, id, action, extra);
      await load();
    } catch (err) {
      setError({ id, message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusyId(null);
    }
  }

  const profile = data?.profile;
  if (!profile) return null;

  const status = profile.hidden
    ? { label: "Hidden by DMY", className: "bg-white/10 text-neutral-300" }
    : PROFILE_STATUS[profile.status];
  const byStatus = (s: string) => data.bookings.filter((b) => b.status === s);
  const requests = byStatus("requested");
  const awaitingPayment = byStatus("accepted");
  const confirmed = byStatus("paid");
  const history = data.bookings.filter((b) => ["completed", "declined", "cancelled"].includes(b.status));
  const pct = Math.round((data.earnings?.commissionRate ?? MODELS_MARKET.commissionRate) * 100);

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">Model dashboard</p>
          <p className="mt-0.5 font-display text-xl font-bold text-white">{profile.name}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${status.className}`}>
          {status.label}
        </span>
      </div>

      {profile.status === "pending" && (
        <p className="mt-3 text-sm text-neutral-400">
          DMY is reviewing your profile. You&apos;ll get an email when it&apos;s live and bookable.
        </p>
      )}

      {data.earnings && profile.status === "approved" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-center">
            <p className="font-display text-2xl font-bold text-white">{ghs(data.earnings.dueGhs)}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-neutral-400">Due to you</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
            <p className="font-display text-2xl font-bold text-white">{ghs(data.earnings.paidOutGhs)}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-neutral-400">Paid out</p>
          </div>
          <p className="col-span-2 text-center text-[11px] text-neutral-500">
            DMY pays you after each shoot — your rate minus {pct}% commission.
          </p>
        </div>
      )}

      <Section title="New requests" count={requests.length} empty="No new requests right now.">
        {requests.map((b) => (
          <RequestCard
            key={b.id}
            b={b}
            pct={pct}
            busy={busyId === b.id}
            error={error?.id === b.id ? error.message : null}
            onAccept={(priceGhs) => respond(b.id, "accept", { priceGhs })}
            onDecline={(reason) => respond(b.id, "decline", { reason })}
          />
        ))}
      </Section>

      {awaitingPayment.length > 0 && (
        <Section title="Waiting for the customer to pay" count={awaitingPayment.length}>
          {awaitingPayment.map((b) => (
            <BookingShell key={b.id} b={b}>
              <p className="mt-2 text-sm text-neutral-400">
                Price {ghs(b.priceGhs)} · you receive {ghs(b.payoutGhs)}. Their contact details show here once they pay.
              </p>
              <button
                onClick={() => respond(b.id, "decline", { reason: "No longer available" })}
                disabled={busyId === b.id}
                className="mt-2 text-xs text-neutral-500 hover:text-red-400"
              >
                Withdraw
              </button>
              {error?.id === b.id && <p className="mt-2 text-sm text-red-400">{error.message}</p>}
            </BookingShell>
          ))}
        </Section>
      )}

      {confirmed.length > 0 && (
        <Section title="Confirmed bookings" count={confirmed.length}>
          {confirmed.map((b) => {
            const shootDone = !b.date || b.date <= new Date().toISOString().slice(0, 10);
            return (
              <BookingShell key={b.id} b={b} name={b.customer?.name}>
                <p className="mt-2 text-sm text-neutral-300">
                  Paid {ghs(b.priceGhs)} · you receive <span className="font-semibold text-white">{ghs(b.payoutGhs)}</span> after the shoot
                </p>
                {b.customer && (
                  <ContactBlock title="Customer" name={b.customer.name} phone={b.customer.phone} email={b.customer.email} />
                )}
                <button
                  onClick={() => respond(b.id, "complete")}
                  disabled={busyId === b.id || !shootDone}
                  className="btn-outline mt-3 disabled:opacity-50"
                >
                  {shootDone ? "Mark shoot completed" : "Mark completed after the shoot"}
                </button>
                {error?.id === b.id && <p className="mt-2 text-sm text-red-400">{error.message}</p>}
              </BookingShell>
            );
          })}
        </Section>
      )}

      {history.length > 0 && (
        <Section title="History" count={history.length}>
          {history.map((b) => (
            <BookingShell key={b.id} b={b} compact>
              {b.status === "completed" && (
                <p className="mt-1 text-xs text-neutral-400">
                  {ghs(b.payoutGhs)} · {b.payoutStatus === "paid" ? "paid out ✓" : "payout pending"}
                </p>
              )}
              {b.review && (
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                  <span className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} filled={n <= b.review!.stars} size={12} />
                    ))}
                  </span>
                  {b.review.comment && <span className="truncate">“{b.review.comment}”</span>}
                </div>
              )}
            </BookingShell>
          ))}
        </Section>
      )}

      <EditProfile profile={profile} onSaved={load} />
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty?: string;
  children: React.ReactNode;
}) {
  if (count === 0 && !empty) return null;
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {title}
        {count > 0 && <span className="ml-1 text-accent">· {count}</span>}
      </p>
      {count === 0 ? <p className="text-sm text-neutral-500">{empty}</p> : <ul className="space-y-3">{children}</ul>}
    </div>
  );
}

function BookingShell({
  b,
  name,
  compact,
  children,
}: {
  b: ModelSideBooking;
  name?: string;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-white">{name || b.customerName}</p>
        <BookingStatusPill status={b.status} />
      </div>
      {compact ? (
        <p className="mt-1 text-xs text-neutral-500">
          {[formatWhen(b.date, null), b.shootType, b.location].filter(Boolean).join(" · ")}
        </p>
      ) : (
        <BookingFacts b={b} />
      )}
      {children}
    </li>
  );
}

function RequestCard({
  b,
  pct,
  busy,
  error,
  onAccept,
  onDecline,
}: {
  b: ModelSideBooking;
  pct: number;
  busy: boolean;
  error: string | null;
  onAccept: (priceGhs: number) => void;
  onDecline: (reason: string) => void;
}) {
  const [price, setPrice] = useState(String(b.offerGhs ?? MODELS_MARKET.minRateGhs));
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const priceNum = Math.round(Number(price)) || 0;
  const payout = priceNum - Math.round(priceNum * (pct / 100));

  return (
    <BookingShell b={b}>
      <p className="mt-2 text-sm text-neutral-300">
        Offer: <span className="font-semibold text-white">{ghs(b.offerGhs)}</span>
      </p>
      {declining ? (
        <div className="mt-3 space-y-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Short note for the customer (optional)"
            className="input text-sm"
            maxLength={300}
          />
          <div className="flex gap-2">
            <button onClick={() => onDecline(reason)} disabled={busy} className="btn-outline border-red-500/40 text-red-300">
              {busy ? "Declining…" : "Decline request"}
            </button>
            <button onClick={() => setDeclining(false)} className="btn-ghost text-xs">
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <label className="label" htmlFor={`price-${b.id}`}>
            Your price (GH₵)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`price-${b.id}`}
              type="number"
              min={MODELS_MARKET.minRateGhs}
              step={50}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input h-10 w-32 py-1 text-sm"
            />
            <button onClick={() => onAccept(priceNum)} disabled={busy} className="btn-accent">
              {busy ? "Saving…" : "Accept"}
            </button>
            <button onClick={() => setDeclining(true)} disabled={busy} className="btn-ghost text-xs">
              Decline
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            You receive {ghs(payout)} after DMY&apos;s {pct}% commission. The customer pays this price to confirm.
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </BookingShell>
  );
}

function EditProfile({ profile, onSaved }: { profile: MyModelProfile; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    rateGhs: String(profile.rateGhs),
    availability: profile.availability ?? "",
    location: profile.location ?? "",
    phone: profile.phone ?? "",
    instagram: profile.instagram ?? "",
    tiktok: profile.tiktok ?? "",
    experience: profile.experience ?? "",
    bio: profile.bio ?? "",
  });
  const [categories, setCategories] = useState<string[]>(profile.categories);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await updateMyModel(token, { ...f, rateGhs: Number(f.rateGhs), categories });
      setMsg("✓ Saved");
      onSaved();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline mt-6 w-full justify-center">
        Edit rate, availability &amp; details
      </button>
    );
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-3 border-t border-white/[0.06] pt-5">
      <p className="text-sm font-semibold text-white">Your details</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="ed-rate">Starting rate (GH₵)</label>
          <input id="ed-rate" type="number" min={MODELS_MARKET.minRateGhs} step={50} required value={f.rateGhs} onChange={set("rateGhs")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ed-location">Location</label>
          <input id="ed-location" required value={f.location} onChange={set("location")} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ed-availability">Availability</label>
        <input id="ed-availability" required value={f.availability} onChange={set("availability")} className="input" />
      </div>
      <div>
        <span className="label">Shoot types</span>
        <div className="flex flex-wrap gap-2">
          {MODEL_CATEGORIES.map((c) => {
            const on = categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setCategories((l) => (on ? l.filter((x) => x !== c) : [...l, c]))}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  on ? "border-accent bg-accent/15 text-white" : "border-white/10 text-neutral-400 hover:border-white/25"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="ed-phone">Phone</label>
          <input id="ed-phone" type="tel" required value={f.phone} onChange={set("phone")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ed-ig">Instagram</label>
          <input id="ed-ig" value={f.instagram} onChange={set("instagram")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ed-tt">TikTok</label>
          <input id="ed-tt" value={f.tiktok} onChange={set("tiktok")} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ed-exp">Experience</label>
        <textarea id="ed-exp" value={f.experience} onChange={set("experience")} className="input min-h-[60px]" />
      </div>
      <div>
        <label className="label" htmlFor="ed-bio">Short bio</label>
        <textarea id="ed-bio" value={f.bio} onChange={set("bio")} className="input min-h-[60px]" />
      </div>
      {msg && <p className={`text-sm ${msg.startsWith("✓") ? "font-semibold text-white" : "text-red-400"}`}>{msg}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-accent">
          {busy ? "Saving…" : "Save details"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">
          Close
        </button>
      </div>
      <p className="text-[11px] text-neutral-500">
        To change your name, age or photos, contact DMY.
      </p>
    </form>
  );
}
