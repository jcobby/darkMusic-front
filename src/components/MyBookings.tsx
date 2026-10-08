"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFanToken } from "./FanAuthProvider";
import { Star } from "./StarRating";
import { BookingFacts, BookingStatusPill, ContactBlock } from "./BookingBits";
import {
  getMyBookings,
  payBooking,
  verifyBookingPayment,
  cancelBooking,
  reviewBooking,
  type CustomerBooking,
} from "@/lib/api";
import { ghs } from "@/lib/modelsMarket";
import { cdnImage } from "@/lib/cdn";

/** The customer's model bookings: pay once accepted, contact after payment, review after. */
export function MyBookings() {
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => {
    const token = getFanToken();
    if (token) setBookings(await getMyBookings(token));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Confirm a booking payment when Paystack returns to /account?booking=1&reference=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");
    const token = getFanToken();
    if (!ref || !params.get("booking") || !token) return;
    verifyBookingPayment(token, ref)
      .then((b) => {
        setNotice(
          b.status === "paid"
            ? `✓ Paid — your booking with ${b.model.name} is confirmed. Their contact details are below.`
            : "Payment wasn't completed. You can try again below."
        );
        void load();
      })
      .catch((err) => setNotice(err instanceof Error ? err.message : "Couldn't confirm the payment"))
      .finally(() => window.history.replaceState({}, "", "/account"));
  }, [load]);

  async function act(id: string, fn: (token: string) => Promise<unknown>) {
    const token = getFanToken();
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await fn(token);
      await load();
    } catch (err) {
      setError({ id, message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusyId(null);
    }
  }

  async function pay(id: string) {
    const token = getFanToken();
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      const { authorizationUrl } = await payBooking(token, id);
      window.location.href = authorizationUrl;
    } catch (err) {
      setError({ id, message: err instanceof Error ? err.message : "Could not start payment" });
      setBusyId(null);
    }
  }

  if (bookings.length === 0 && !notice) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-white">Your model bookings</p>
        <Link href="/models" className="text-xs font-semibold text-accent hover:underline">
          Book a model →
        </Link>
      </div>
      {notice && (
        <p
          className={`mt-3 rounded-xl p-3 text-sm ${
            notice.startsWith("✓") ? "bg-accent/15 font-semibold text-white" : "bg-white/5 text-neutral-300"
          }`}
        >
          {notice}
        </p>
      )}

      <ul className="mt-4 space-y-4">
        {bookings.map((b) => (
          <li key={b.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-start gap-3">
              {b.model.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cdnImage(b.model.photo, 120)} alt="" className="h-12 w-10 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-white">{b.model.name}</p>
                  <BookingStatusPill status={b.status} />
                </div>
                <BookingFacts b={b} />
              </div>
            </div>

            {b.status === "requested" && (
              <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                <span className="text-neutral-400">Your offer: {ghs(b.offerGhs)}</span>
                <button
                  onClick={() => act(b.id, (t) => cancelBooking(t, b.id))}
                  disabled={busyId === b.id}
                  className="text-xs text-neutral-500 hover:text-red-400"
                >
                  Cancel request
                </button>
              </div>
            )}

            {b.status === "accepted" && (
              <div className="mt-3">
                <p className="text-sm text-neutral-300">
                  {b.model.name} accepted at <span className="font-bold text-white">{ghs(b.priceGhs)}</span>.
                  Pay to confirm — their contact details unlock right after.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={() => pay(b.id)} disabled={busyId === b.id} className="btn-accent">
                    {busyId === b.id ? "Starting…" : `Pay ${ghs(b.priceGhs)}`}
                  </button>
                  <button
                    onClick={() => act(b.id, (t) => cancelBooking(t, b.id))}
                    disabled={busyId === b.id}
                    className="text-xs text-neutral-500 hover:text-red-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {b.status === "declined" && (
              <p className="mt-3 text-sm text-neutral-400">
                {b.declineReason ? `“${b.declineReason}”` : "The model isn't available for this one."}{" "}
                <Link href="/models" className="text-accent hover:underline">
                  Find another model
                </Link>
              </p>
            )}

            {b.status === "cancelled" && (
              <p className="mt-3 text-sm text-neutral-500">
                Cancelled{b.cancelledBy === "customer" ? " by you" : b.cancelledBy === "admin" ? " by DMY" : ""}.
              </p>
            )}

            {(b.status === "paid" || b.status === "completed") && (
              <>
                <p className="mt-3 text-sm text-neutral-400">Paid {ghs(b.priceGhs)} through DMY.</p>
                {b.contact && (
                  <ContactBlock
                    title={`Reach ${b.model.name}`}
                    phone={b.contact.phone}
                    email={b.contact.email}
                  />
                )}
              </>
            )}

            {b.status === "completed" &&
              (b.review ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-neutral-400">
                  Your review:
                  <span className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} filled={n <= b.review!.stars} size={14} />
                    ))}
                  </span>
                </div>
              ) : (
                <ReviewForm
                  busy={busyId === b.id}
                  onSubmit={(stars, comment) => act(b.id, (t) => reviewBooking(t, b.id, stars, comment))}
                />
              ))}

            {error?.id === b.id && <p className="mt-2 text-sm text-red-400">{error.message}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (stars: number, comment: string) => void;
}) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] p-3">
      <p className="text-sm font-semibold text-white">How was it?</p>
      <div className="mt-1 flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="transition-transform hover:scale-110"
          >
            <Star filled={n <= (hover || stars)} size={22} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="A few words for other customers (optional)"
        className="input mt-2 min-h-[60px] text-sm"
        maxLength={1000}
      />
      <button
        onClick={() => onSubmit(stars, comment)}
        disabled={busy || stars === 0}
        className="btn-accent mt-2 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Post review"}
      </button>
    </div>
  );
}
