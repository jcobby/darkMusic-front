"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useFanAuth } from "@/components/FanAuthProvider";
import { verifyEmail } from "@/lib/api";

export default function VerifyEmailPage() {
  const { refreshMe } = useFanAuth();
  const [state, setState] = useState<"checking" | "done" | "error" | "missing">("checking");
  const [message, setMessage] = useState("");
  const [points, setPoints] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against double-run in dev strict mode
    ran.current = true;
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("missing");
      return;
    }
    verifyEmail(token)
      .then(({ message, points }) => {
        setMessage(message);
        setPoints(points ?? 0);
        setState("done");
        void refreshMe().catch(() => {}); // the reminder banner goes away on this device
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "This link is invalid or has expired");
        setState("error");
      });
  }, [refreshMe]); // runs once (the ref above); refreshMe never changes

  return (
    <>
      <PageHeader eyebrow="Account" title="Confirm your email" />
      <section className="container-page py-14">
        <div className="mx-auto max-w-md">
          <div className="card p-8 text-center">
            {state === "checking" && <p className="text-neutral-400">Confirming your email…</p>}
            {state === "done" && (
              <>
                <p className="text-lg font-semibold text-white">✓ {message}</p>
                {points > 0 && <p className="mt-2 font-display text-2xl font-bold text-yellow-300">+{points} points 🎉</p>}
                <p className="mt-2 text-sm text-neutral-400">
                  Your email is confirmed — you can now upload content.
                </p>
                <Link href="/account" className="btn-accent mt-6 inline-flex justify-center">
                  Go to your account
                </Link>
              </>
            )}
            {(state === "error" || state === "missing") && (
              <>
                <p className="text-lg font-semibold text-white">Link problem</p>
                <p className="mt-2 text-sm text-neutral-400">
                  {state === "missing" ? "This link is missing its token." : message}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  Sign in and use “Resend confirmation email”.
                </p>
                <Link href="/account" className="btn-outline mt-6 inline-flex justify-center">
                  Go to sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
