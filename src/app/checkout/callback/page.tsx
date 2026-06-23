"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { verifyCheckout, type OrderSummary } from "@/lib/api";

function CallbackInner() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref") || "";
  const { clear } = useCart();
  const [state, setState] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cleared = useRef(false);

  useEffect(() => {
    if (!reference) {
      setState("error");
      setError("Missing payment reference.");
      return;
    }
    verifyCheckout(reference)
      .then((o) => {
        setOrder(o);
        if (o.status === "paid") {
          setState("paid");
          if (!cleared.current) {
            clear();
            cleared.current = true;
          }
        } else {
          setState("pending");
        }
      })
      .catch((err) => {
        setState("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      });
  }, [reference, clear]);

  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-xl">
        {state === "loading" && (
          <Box title="Confirming your payment…" body="Hold on while we verify with Paystack." />
        )}

        {state === "paid" && order && (
          <div className="card p-8 text-center">
            <p className="text-3xl">✅</p>
            <h1 className="mt-3 text-2xl font-bold text-white">Payment successful</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Order <span className="text-neutral-200">{order.reference}</span> · GH₵
              {order.totalGhs}
            </p>

            {order.downloads.length > 0 && (
              <div className="mt-6 space-y-2 text-left">
                <p className="label">Your downloads</p>
                {order.downloads.map((d) => (
                  <a
                    key={d.url}
                    href={d.url}
                    className="card flex items-center justify-between p-3 text-sm hover:border-accent"
                  >
                    <span className="text-neutral-100">{d.name}</span>
                    <span className="text-accent">Download ↓</span>
                  </a>
                ))}
                <p className="pt-1 text-xs text-neutral-500">
                  Links expire in 48 hours. Save your files somewhere safe.
                </p>
              </div>
            )}

            {order.items.some((i) => i.kind === "merch") && (
              <p className="mt-5 rounded-xl border border-ink-600 bg-ink-800 p-3 text-sm text-neutral-300">
                We&apos;ll be in touch by email to arrange delivery of your merch.
              </p>
            )}

            <Link href="/" className="btn-accent mt-7 inline-flex">
              Back to home
            </Link>
          </div>
        )}

        {state === "pending" && (
          <Box
            title="Payment not completed"
            body="We couldn't confirm a successful payment for this order. If you were charged, contact us and we'll sort it out."
            action
          />
        )}

        {state === "error" && (
          <Box title="Something went wrong" body={error || "Please try again."} action />
        )}
      </div>
    </section>
  );
}

function Box({ title, body, action }: { title: string; body: string; action?: boolean }) {
  return (
    <div className="card p-8 text-center">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm text-neutral-400">{body}</p>
      {action && (
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/cart" className="btn-outline">
            Back to cart
          </Link>
          <Link href="/contact" className="btn-accent">
            Contact support
          </Link>
        </div>
      )}
    </div>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={<section className="container-page py-20 text-center text-neutral-500">Loading…</section>}>
      <CallbackInner />
    </Suspense>
  );
}
