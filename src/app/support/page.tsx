"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PaymentBadges } from "@/components/PaymentBadges";
import { initializeDonation } from "@/lib/api";

const PRESETS = [5, 10, 20, 50, 100];

export default function SupportPage() {
  const [amount, setAmount] = useState(20);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount = custom ? Number(custom) : amount;

  async function donate() {
    if (!email) {
      setError("Please enter your email for the receipt.");
      return;
    }
    if (!Number.isFinite(effectiveAmount) || effectiveAmount < 1) {
      setError("Enter an amount of at least GH₵1.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { authorizationUrl } = await initializeDonation({
        email,
        name,
        amountGhs: effectiveAmount,
        message,
      });
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment");
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Support the movement"
        subtitle="Love the music? Back it directly. Every cedi helps fund new records, videos and shows — straight from you to Dark Music Yard."
      />
      <section className="container-page py-12">
        <div className="card mx-auto max-w-xl p-7">
          <p className="label">Choose an amount (GH₵)</p>
          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
                className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                  !custom && amount === p
                    ? "border-accent bg-accent text-ink"
                    : "border-ink-500 text-neutral-200 hover:border-accent"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            placeholder="Or enter a custom amount"
            className="input mt-3"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                Name (optional)
              </label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Email <span className="text-accent">*</span>
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="label" htmlFor="message">
              Message (optional)
            </label>
            <textarea
              id="message"
              className="input min-h-[80px]"
              placeholder="Say something to the artist…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button onClick={donate} disabled={loading} className="btn-accent mt-6 w-full">
            {loading
              ? "Redirecting…"
              : `Support — GH₵${Number.isFinite(effectiveAmount) ? effectiveAmount : 0}`}
          </button>
          <p className="mt-3 text-center text-xs text-neutral-500">
            Secure payment via Paystack — cards &amp; Mobile Money (MTN / Telecel).
          </p>
          <PaymentBadges className="mt-3 justify-center" />
        </div>
      </section>
    </>
  );
}
