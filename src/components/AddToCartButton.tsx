"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartKind } from "./CartProvider";

interface Props {
  kind: CartKind;
  refId: string;
  name: string;
  priceGhs: number;
  digital: boolean;
  size?: string;
  image?: string;
  label?: string;
  goToCart?: boolean;
  className?: string;
  disabled?: boolean;
}

/** Adds an item to the cart and shows transient feedback (or jumps to cart). */
export function AddToCartButton({
  kind,
  refId,
  name,
  priceGhs,
  digital,
  size,
  image,
  label,
  goToCart = false,
  className = "btn-accent",
  disabled = false,
}: Props) {
  const { add } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function handle() {
    add({ kind, refId, name, priceGhs, digital, size, image });
    if (goToCart) {
      router.push("/cart");
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button type="button" onClick={handle} disabled={disabled} className={className}>
      {added ? "Added ✓" : label ?? `Buy — GH₵${priceGhs}`}
    </button>
  );
}
