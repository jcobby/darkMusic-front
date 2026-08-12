"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { verifyEmail } from "@/lib/api";

export default function VerifyEmailPage() {
  const [state, setState] = useState<"checking" | "done" | "error" | "missing">("checking");
  const [message, setMessage] = useState("");
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
      .then(({ message }) => {
        setMessage(message);
        setState("done");
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "This link is invalid or has expired");
        setState("error");
      });
  }, []);

  return (
    <>
      <PageHeader eyebrow="Account" title="Confirm your email" />
      <section className="container-page py-14">
        <div className="mx-auto max-w-md">
          <div className="card p-8 text-center">
            {state === "checking" && <p className="text-neutral-400">Confirming your email…</p>}
            {state === "done" && (
              <>
                <p className="text-lg font-semibold text-white">✅ {message}</p>
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
