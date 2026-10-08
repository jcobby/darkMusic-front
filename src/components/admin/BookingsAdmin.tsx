"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet, adminPatch } from "@/lib/adminApi";
import { BookingFacts, BookingStatusPill } from "@/components/BookingBits";
import { MODELS_MARKET, ghs } from "@/lib/modelsMarket";

interface AdminBooking {
  _id: string;
  modelName: string;
  customer?: string;
  clientName: string;
  email: string;
  phone?: string;
  date?: string;
  time?: string;
  location?: string;
  eventType?: string;
  durationHours?: number;
  modelsCount?: number;
  message?: string;
  offerGhs?: number;
  budget?: string;
  priceGhs?: number;
  commissionGhs?: number;
  payoutGhs?: number;
  declineReason?: string;
  cancelledBy?: string;
  paystackRef?: string;
  paidAt?: string;
  payoutStatus?: "unpaid" | "paid";
  payoutAt?: string;
  payoutNote?: string;
  review?: { stars: number; comment?: string };
  status: string;
  createdAt: string;
}

const FILTERS = {
  active: { label: "Active", match: (b: AdminBooking) => ["requested", "accepted", "paid"].includes(b.status) },
  payout: {
    label: "Payout due",
    match: (b: AdminBooking) => b.status === "completed" && b.payoutStatus !== "paid",
  },
  history: {
    label: "History",
    match: (b: AdminBooking) =>
      ["declined", "cancelled"].includes(b.status) || (b.status === "completed" && b.payoutStatus === "paid"),
  },
  legacy: { label: "Old enquiries", match: (b: AdminBooking) => ["new", "read", "archived"].includes(b.status) },
} as const;
type FilterKey = keyof typeof FILTERS;

export function BookingsAdmin() {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await adminGet<AdminBooking[]>("/bookings"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: string, extra: Record<string, unknown> = {}) {
    setBusyId(id);
    setRowError(null);
    try {
      await adminPatch(`/bookings/${id}`, { action, ...extra });
      await load();
    } catch (err) {
      setRowError({ id, message: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  const paidOrDone = rows.filter((b) => b.status === "paid" || b.status === "completed");
  const totals = {
    commission: paidOrDone.reduce((s, b) => s + (b.commissionGhs ?? 0), 0),
    owed: rows.filter(FILTERS.payout.match).reduce((s, b) => s + (b.payoutGhs ?? 0), 0),
    upcoming: rows.filter((b) => b.status === "paid").reduce((s, b) => s + (b.payoutGhs ?? 0), 0),
    paidOut: rows.filter((b) => b.payoutStatus === "paid").reduce((s, b) => s + (b.payoutGhs ?? 0), 0),
  };
  const shown = rows.filter(FILTERS[filter].match);

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label={`DMY commission (${MODELS_MARKET.commissionRate * 100}%)`} value={ghs(totals.commission)} accent />
        <Stat label="Payouts due now" value={ghs(totals.owed)} />
        <Stat label="Payouts after upcoming shoots" value={ghs(totals.upcoming)} />
        <Stat label="Paid out to models" value={ghs(totals.paidOut)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as FilterKey[]).map((k) => {
          const count = rows.filter(FILTERS[k].match).length;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === k ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              {FILTERS[k].label} · {count}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="card p-8 text-center text-sm text-neutral-500">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((b) => (
            <BookingRow
              key={b._id}
              b={b}
              busy={busyId === b._id}
              error={rowError?.id === b._id ? rowError.message : null}
              act={(action, extra) => act(b._id, action, extra)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className={`font-display text-2xl font-bold ${accent ? "text-accent" : "text-white"}`}>{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
    </div>
  );
}

function BookingRow({
  b,
  busy,
  error,
  act,
}: {
  b: AdminBooking;
  busy: boolean;
  error: string | null;
  act: (action: string, extra?: Record<string, unknown>) => void;
}) {
  const [price, setPrice] = useState(String(b.offerGhs ?? MODELS_MARKET.minRateGhs));
  const [note, setNote] = useState("");
  const legacy = ["new", "read", "archived"].includes(b.status);

  function cancel() {
    const msg =
      b.status === "paid"
        ? "Cancel this PAID booking? You'll need to refund the customer yourself in Paystack."
        : "Cancel this booking?";
    if (confirm(msg)) act("cancel");
  }

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="rounded-full bg-ink-600 px-2 py-0.5 text-[11px] font-medium uppercase text-accent">
            Model: {b.modelName}
          </span>
          <span className="ml-2 font-semibold text-white">{b.clientName}</span>
          <p className="text-xs text-neutral-500">
            {b.email}
            {b.phone ? ` · ${b.phone}` : ""} · requested {new Date(b.createdAt).toLocaleString()}
          </p>
        </div>
        <BookingStatusPill status={b.status} />
      </div>

      <BookingFacts
        b={{
          date: b.date ?? null,
          time: b.time ?? null,
          location: b.location ?? null,
          shootType: b.eventType ?? null,
          durationHours: b.durationHours ?? null,
          modelsCount: b.modelsCount ?? 1,
          requirements: b.message ?? null,
        }}
      />

      <p className="mt-2 text-sm text-neutral-400">
        {b.offerGhs !== undefined && <>Offer {ghs(b.offerGhs)}</>}
        {b.budget && <>Budget: {b.budget}</>}
        {b.priceGhs !== undefined && (
          <>
            {" "}
            · Price <span className="text-white">{ghs(b.priceGhs)}</span> · DMY {ghs(b.commissionGhs)} · Model{" "}
            {ghs(b.payoutGhs)}
          </>
        )}
      </p>
      {b.paystackRef && (
        <p className="text-xs text-neutral-500">
          Paid {b.paidAt ? new Date(b.paidAt).toLocaleString() : ""} · ref {b.paystackRef}
        </p>
      )}
      {b.payoutStatus === "paid" && (
        <p className="text-xs font-semibold text-white">
          ✓ Payout sent {b.payoutAt ? new Date(b.payoutAt).toLocaleDateString() : ""}
          {b.payoutNote ? ` · ${b.payoutNote}` : ""}
        </p>
      )}
      {b.declineReason && <p className="text-xs text-neutral-500">Decline note: “{b.declineReason}”</p>}
      {b.cancelledBy && <p className="text-xs text-neutral-500">Cancelled by {b.cancelledBy}</p>}
      {b.review && (
        <p className="text-xs text-neutral-400">
          Review: {"★".repeat(b.review.stars)}
          {b.review.comment ? ` “${b.review.comment}”` : ""}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {b.status === "requested" && (
          <>
            <input
              type="number"
              min={MODELS_MARKET.minRateGhs}
              step={50}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input h-9 w-28 py-1 text-sm"
              aria-label="Price in GH₵"
            />
            <button onClick={() => act("accept", { priceGhs: Number(price) })} disabled={busy} className="btn-accent px-3 py-1.5 text-xs">
              Accept for model
            </button>
            <button onClick={() => act("decline")} disabled={busy} className="btn-ghost text-xs">
              Decline
            </button>
          </>
        )}
        {b.status === "paid" && (
          <button onClick={() => act("complete")} disabled={busy} className="btn-outline px-3 py-1.5 text-xs">
            Mark completed
          </button>
        )}
        {b.status === "completed" && b.payoutStatus !== "paid" && (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Payout note (e.g. MoMo ref)"
              className="input h-9 w-56 py-1 text-sm"
            />
            <button onClick={() => act("payout", { note })} disabled={busy} className="btn-accent px-3 py-1.5 text-xs">
              Record {ghs(b.payoutGhs)} payout
            </button>
          </>
        )}
        {["requested", "accepted", "paid"].includes(b.status) && (
          <button onClick={cancel} disabled={busy} className="text-xs text-neutral-500 hover:text-red-400">
            Cancel booking
          </button>
        )}
        {legacy && (
          <>
            <button onClick={() => act("read")} disabled={busy} className="btn-ghost text-xs">
              Mark read
            </button>
            <button onClick={() => act("archive")} disabled={busy} className="btn-ghost text-xs">
              Archive
            </button>
          </>
        )}
        <a href={`mailto:${b.email}`} className="btn-outline px-3 py-1.5 text-xs">
          Email customer
        </a>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </li>
  );
}
