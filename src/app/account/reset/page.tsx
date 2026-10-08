"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PasswordInput } from "@/components/PasswordInput";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="Set a new password" />
      <section className="container-page py-14">
        <div className="mx-auto max-w-md">
          {done ? (
            <div className="card p-8 text-center">
              <p className="font-semibold text-white">Password updated ✓</p>
              <p className="mt-2 text-sm text-neutral-400">You can now sign in with your new password.</p>
              <Link href="/account" className="btn-accent mt-6 inline-flex justify-center">
                Go to sign in
              </Link>
            </div>
          ) : token === null ? (
            <div className="card p-8 text-center text-neutral-500">Checking your link…</div>
          ) : !token ? (
            <div className="card p-8 text-center">
              <p className="text-neutral-300">This reset link is missing its token.</p>
              <Link href="/account" className="mt-4 inline-block text-sm text-accent hover:underline">
                Request a new one
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="card space-y-4 p-8">
              <div>
                <label className="label" htmlFor="new">
                  New password
                </label>
                <PasswordInput
                  id="new"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={busy} className="btn-accent w-full justify-center">
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
