"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Merch } from "@/lib/api";
import { useCart } from "./CartProvider";

export function MerchPurchase({ product }: { product: Merch }) {
  const { add } = useCart();
  const router = useRouter();
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const needsSize = product.sizes.length > 0;

  function addToCart(goToCart: boolean) {
    if (needsSize && !size) {
      setError("Please select a size.");
      return;
    }
    setError(null);
    add({
      kind: "merch",
      refId: product.id,
      name: product.name,
      priceGhs: product.priceGhs,
      digital: false,
      size: size || undefined,
      image: product.images[0],
      qty,
    });
    if (goToCart) router.push("/cart");
  }

  if (!product.inStock) {
    return (
      <p className="rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-sm text-neutral-400">
        This item is currently sold out.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {needsSize && (
        <div>
          <p className="label">Size</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`min-w-12 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  size === s
                    ? "border-accent bg-accent text-ink"
                    : "border-ink-600 text-neutral-200 hover:border-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="label">Quantity</p>
        <div className="inline-flex items-center rounded-lg border border-ink-600">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-neutral-300 hover:text-white"
          >
            −
          </button>
          <span className="w-10 text-center text-sm">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            className="px-3 py-2 text-neutral-300 hover:text-white"
          >
            +
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button onClick={() => addToCart(false)} className="btn-outline">
          Add to cart
        </button>
        <button onClick={() => addToCart(true)} className="btn-accent">
          Buy now — GH₵{product.priceGhs * qty}
        </button>
      </div>
    </div>
  );
}
