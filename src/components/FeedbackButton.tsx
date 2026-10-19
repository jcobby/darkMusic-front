"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { sendFeedback } from "@/lib/api";
import { getFanToken, useFanAuth } from "./FanAuthProvider";

const OPEN_EVENT = "dmy:feedback";

/** Open the feedback form from anywhere (e.g. the footer link). */
export const openFeedback = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** "Send feedback" link for places like the footer. */
export function FeedbackLink({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openFeedback} className={className}>
      Send feedback
    </button>
  );
}

/**
 * The "Feedback" tab on the left edge of every page — out of the way of the
 * player, the Support button and popups along the bottom. Hidden in admin and
 * while a game is running (see globals.css).
 */
export function FeedbackButton() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="feedback-tab fixed left-0 top-1/2 z-[43] -translate-y-1/2 rotate-180 rounded-l-xl border border-r-0 border-accent/40 bg-ink-700/90 px-1.5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-glow-sm backdrop-blur-sm transition hover:bg-accent [writing-mode:vertical-rl]"
      >
        Feedback
      </button>
      {open && <FeedbackDialog page={pathname} onClose={close} />}
    </>
  );
}

const RATING_WORDS = ["", "Bad", "Not great", "Okay", "Good", "Love it"];

function FeedbackDialog({ page, onClose }: { page: string; onClose: () => void }) {
  const { user } = useFanAuth();
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // stays empty for people (a trap for spam bots)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    box.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!sent) return;
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [sent, onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (message.trim().length < 3) return setError("Tell us a little more");
    setBusy(true);
    setError(null);
    try {
      await sendFeedback(getFanToken(), {
        message: message.trim(),
        rating,
        page,
        ...(user ? {} : { name: name.trim() || undefined, email: email.trim() || undefined }),
        website,
      });
      setSent(true);
      // Mark the visit in Clarity, so the recording of it is easy to find.
      window.clarity?.("event", "feedback_sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send it — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send feedback"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card relative max-h-[90dvh] w-full animate-fade-up overflow-y-auto rounded-b-none p-6 sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        {sent ? (
          <div className="py-6 text-center">
            <p className="font-display text-2xl font-bold text-white">✓ Thank you!</p>
            <p className="mt-2 text-sm text-neutral-300">We got your feedback — we read every message.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="pr-10">
              <h2 className="font-display text-2xl font-bold text-white">Send us feedback</h2>
              <p className="mt-1 text-sm text-neutral-400">
                What you like, what isn&apos;t working, or what you&apos;d love to see. We read every message.
              </p>
            </div>

            <div>
              <p className="label">How&apos;s the site for you? (optional)</p>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n === 1 ? "" : "s"} — ${RATING_WORDS[n]}`}
                    onClick={() => setRating(rating === n ? null : n)}
                    className={`grid h-11 w-11 place-items-center rounded-full text-2xl transition ${
                      rating !== null && n <= rating ? "text-yellow-400" : "text-neutral-600 hover:text-neutral-400"
                    }`}
                  >
                    ★
                  </button>
                ))}
                {rating !== null && <span className="ml-2 text-sm text-neutral-300">{RATING_WORDS[rating]}</span>}
              </div>
            </div>

            <div>
              <label htmlFor="fb-message" className="label">
                Your message
              </label>
              <textarea
                id="fb-message"
                ref={box}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={4}
                required
                className="input resize-y"
                placeholder="e.g. The play button didn't work on my phone…"
              />
            </div>

            {user ? (
              <p className="text-xs text-neutral-500">Sending as {user.name || user.email} — we can reply by email.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="fb-name" className="label">
                    Name (optional)
                  </label>
                  <input id="fb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="input" autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="fb-email" className="label">
                    Email, for a reply (optional)
                  </label>
                  <input
                    id="fb-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={120}
                    className="input"
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={busy} className="btn-accent min-h-[48px] w-full">
              {busy ? "Sending…" : "Send feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
