"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyDonation } from "@/lib/api";

function CallbackInner() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref") || "";
  const [state, setState] = useState<"loading" | "paid" | "failed" | "error">("loading");
  const [data, setData] = useState<{ amountGhs: number; name: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setState("error");
      setError("Missing payment reference.");
      return;
    }
    verifyDonation(reference)
      .then((d) => {
        setData({ amountGhs: d.amountGhs, name: d.name });
        setState(d.status === "paid" ? "paid" : "failed");
      })
      .catch((err) => {
        setState("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      });
  }, [reference]);

  return (
    <section className="container-page py-20">
      <div className="card mx-auto max-w-lg p-8 text-center">
        {state === "loading" && (
          <>
            <h1 className="text-2xl font-bold text-white">Confirming your support…</h1>
            <p className="mt-2 text-sm text-neutral-400">Hold on while we verify with Paystack.</p>
          </>
        )}

        {state === "paid" && data && (
          <>
            <p className="text-4xl">💚</p>
            <h1 className="mt-3 text-2xl font-bold text-white">
              Thank you{data.name ? `, ${data.name}` : ""}!
            </h1>
            <p className="mt-2 text-neutral-300">
              Your <span className="font-semibold text-accent">GH₵{data.amountGhs}</span> means the
              world — it goes straight into the music.
            </p>
            <Link href="/" className="btn-accent mt-7 inline-flex">
              Back to home
            </Link>
          </>
        )}

        {state === "failed" && (
          <>
            <h1 className="text-2xl font-bold text-white">Payment not completed</h1>
            <p className="mt-2 text-sm text-neutral-400">
              We couldn&apos;t confirm your payment. If you were charged, contact us and we&apos;ll
              sort it out.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/support" className="btn-outline">
                Try again
              </Link>
              <Link href="/contact" className="btn-accent">
                Contact
              </Link>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="mt-2 text-sm text-neutral-400">{error}</p>
            <Link href="/support" className="btn-accent mt-6 inline-flex">
              Back to support
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

export default function SupportCallbackPage() {
  return (
    <Suspense
      fallback={
        <section className="container-page py-20 text-center text-neutral-500">Loading…</section>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
