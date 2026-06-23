"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { CoverArt } from "@/components/CoverArt";
import { PaymentBadges } from "@/components/PaymentBadges";
import { initializeCheckout } from "@/lib/api";

export default function CartPage() {
  const { items, total, count, setQty, remove } = useCart();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    if (!email) {
      setError("Enter your email so we can deliver downloads and your receipt.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { authorizationUrl } = await initializeCheckout({
        email,
        name,
        items: items.map((i) => ({
          kind: i.kind,
          refId: i.refId,
          qty: i.qty,
          size: i.size,
        })),
      });
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  if (count === 0) {
    return (
      <section className="container-page py-24 text-center">
        <h1 className="text-2xl font-bold text-white">Your cart is empty</h1>
        <p className="mt-2 text-neutral-400">Add music, beats or merch to get started.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/music" className="btn-accent">
            Browse Music
          </Link>
          <Link href="/merch" className="btn-outline">
            Shop Merch
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page py-12">
      <h1 className="mb-8 text-3xl font-bold text-white">Your Cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Items */}
        <div className="space-y-4">
          {items.map((i) => (
            <div key={i.key} className="card flex gap-4 p-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                <CoverArt src={i.image} alt={i.name} label={i.name} />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{i.name}</p>
                    <p className="text-xs text-neutral-500">
                      {i.digital ? "Digital download" : "Merchandise"}
                      {i.size ? ` · Size ${i.size}` : ""}
                    </p>
                  </div>
                  <p className="font-semibold text-accent">GH₵{i.priceGhs * i.qty}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  {i.digital ? (
                    <span className="text-xs text-neutral-500">Qty 1</span>
                  ) : (
                    <div className="inline-flex items-center rounded-lg border border-ink-600">
                      <button
                        onClick={() => setQty(i.key, i.qty - 1)}
                        className="px-2.5 py-1 text-neutral-300 hover:text-white"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">{i.qty}</span>
                      <button
                        onClick={() => setQty(i.key, i.qty + 1)}
                        className="px-2.5 py-1 text-neutral-300 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => remove(i.key)}
                    className="text-xs text-neutral-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary + checkout */}
        <div className="card h-fit space-y-5 p-6">
          <div className="flex justify-between text-sm text-neutral-400">
            <span>Subtotal</span>
            <span className="text-base font-bold text-white">GH₵{total}</span>
          </div>
          <div className="space-y-3 border-t border-ink-600 pt-4">
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
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button onClick={checkout} disabled={loading} className="btn-accent w-full">
            {loading ? "Redirecting…" : `Pay with Paystack — GH₵${total}`}
          </button>
          <p className="text-center text-xs text-neutral-500">
            Cards & Mobile Money (MTN / Telecel). Downloads are delivered right after payment.
          </p>
          <PaymentBadges className="justify-center" />
        </div>
      </div>
    </section>
  );
}
