"use client";

import { useState, type FormEvent } from "react";
import { CoverArt } from "./CoverArt";
import { submitBooking, type ModelProfileItem } from "@/lib/api";

/** Modal: photo gallery of one model + a booking-request form. */
export function BookModelDialog({
  model,
  onClose,
}: {
  model: ModelProfileItem;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  const [form, setForm] = useState({
    clientName: "",
    email: "",
    phone: "",
    date: "",
    eventType: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submitBooking({ modelId: model.id, ...form });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card animate-fade-up relative my-8 w-full max-w-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-neutral-200 transition hover:bg-black/70 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="grid md:grid-cols-2">
          {/* Gallery */}
          <div className="bg-ink-800">
            <div className="relative aspect-[3/4] w-full overflow-hidden">
              <CoverArt src={model.photos[active]} alt={model.name} label={model.name} />
            </div>
            {model.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {model.photos.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`relative h-14 w-12 shrink-0 overflow-hidden rounded-md border-2 transition ${
                      i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details + form */}
          <div className="p-6">
            <h2 className="font-display text-2xl font-bold text-white">{model.name}</h2>
            <p className="mt-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-accent">
              GH₵{model.rateGhs.toLocaleString()}
            </p>
            {model.bio && <p className="mt-3 text-sm leading-relaxed text-neutral-400">{model.bio}</p>}

            {done ? (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                ✅ Request sent! We&apos;ll get back to you by email to arrange {model.name}&apos;s booking.
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-3">
                <input
                  className="input"
                  placeholder="Your name *"
                  required
                  value={form.clientName}
                  onChange={set("clientName")}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="Your email *"
                  required
                  value={form.email}
                  onChange={set("email")}
                />
                <input
                  className="input"
                  placeholder="Phone / WhatsApp"
                  value={form.phone}
                  onChange={set("phone")}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input"
                    placeholder="Date needed"
                    value={form.date}
                    onChange={set("date")}
                  />
                  <input
                    className="input"
                    placeholder="What for?"
                    value={form.eventType}
                    onChange={set("eventType")}
                  />
                </div>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Details (location, hours, anything else)"
                  value={form.message}
                  onChange={set("message")}
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button type="submit" disabled={busy} className="btn-accent w-full justify-center">
                  {busy ? "Sending…" : `Request booking`}
                </button>
                <p className="text-center text-[11px] text-neutral-500">
                  No payment now — we&apos;ll confirm availability &amp; details with you.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
