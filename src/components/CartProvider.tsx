"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartKind = "release_mp3" | "beat_wav" | "merch";

export interface CartItem {
  key: string; // unique per kind+refId+size
  kind: CartKind;
  refId: string;
  name: string;
  priceGhs: number;
  qty: number;
  size?: string;
  image?: string;
  digital: boolean;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "key" | "qty"> & { qty?: number }) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "dmy_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const add: CartContextValue["add"] = (item) => {
      const key = `${item.kind}:${item.refId}:${item.size ?? ""}`;
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        // Digital items are single-quantity.
        if (existing) {
          if (item.digital) return prev;
          return prev.map((i) =>
            i.key === key ? { ...i, qty: i.qty + (item.qty ?? 1) } : i
          );
        }
        return [...prev, { ...item, key, qty: item.digital ? 1 : item.qty ?? 1 }];
      });
    };
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((sum, i) => sum + i.priceGhs * i.qty, 0),
      add,
      remove: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
      setQty: (key, qty) =>
        setItems((prev) =>
          prev
            .map((i) => (i.key === key ? { ...i, qty: Math.max(1, qty) } : i))
            .filter((i) => i.qty > 0)
        ),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
