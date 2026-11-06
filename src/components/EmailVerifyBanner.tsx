"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useFanAuth, getFanToken } from "./FanAuthProvider";
import { resendVerification } from "@/lib/api";

const KEY = "dmy_email_banner_closed"; // when they closed it — it comes back the next day
const REOPEN_AFTER_MS = 86400e3;
const POINTS = 25;

/**
 * For a signed-in member who hasn't confirmed their email: a reminder under the header on
 * every page with a Resend button, then a note that the link is on its way.
 */
export function EmailVerifyBanner() {
  const { user } = useFanAuth();
  const pathname = usePathname() || "/";
  const [closed, setClosed] = useState(true);
  const [state, setState] = useState<{ kind: "sent" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setClosed(Date.now() - Number(localStorage.getItem(KEY) || 0) < REOPEN_AFTER_MS);
    } catch {
      setClosed(false);
    }
  }, []);

  // Not for admins, not on the confirm page itself, and not inside a game (it would push the board down).
  const hidden = pathname.startsWith("/admin") || pathname.startsWith("/account/verify") || /^\/games\/./.test(pathname);
  if (!user || user.emailVerified || hidden || closed) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* private mode — just hide it for now */
    }
    setClosed(true);
  };
  const resend = async () => {
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    try {
      await resendVerification(token);
      setState({ kind: "sent", text: `A confirmation link has been sent to ${user.email}. Click the link in the email to confirm your address (check spam too).` });
    } catch (err) {
      setState({ kind: "error", text: err instanceof Error ? err.message : "Couldn't send it right now — try again shortly." });
    } finally {
      setBusy(false);
    }
  };

  const X = (
    <button type="button" onClick={close} aria-label="Close the email reminder" className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition hover:bg-black/10">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      </svg>
    </button>
  );
  return (
    <div className="container-page space-y-2 pt-3">
      {state?.kind === "sent" && (
        <div role="status" className="flex items-start gap-3 rounded-xl bg-teal-400 px-4 py-3 text-sm font-medium text-ink">
          <p className="min-w-0 flex-1">✉️ {state.text}</p>
          {X}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-400 px-4 py-3 text-sm text-ink">
        <p className="min-w-0 flex-1 basis-60">
          We noticed you haven&apos;t confirmed your email address yet. <b>Confirm it now and earn {POINTS} points.</b>
          {state?.kind === "error" && <span className="mt-1 block font-semibold text-red-900">{state.text}</span>}
        </p>
        <button type="button" onClick={resend} disabled={busy} className="min-h-[40px] shrink-0 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60">
          {busy ? "Sending…" : state?.kind === "sent" ? "Send it again" : "Resend confirmation email"}
        </button>
        {!state && X}
      </div>
    </div>
  );
}
