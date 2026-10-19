"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet, adminPatch } from "@/lib/adminApi";

interface FeedbackItem {
  id: string;
  rating: number | null;
  message: string;
  page: string;
  device: "phone" | "tablet" | "desktop";
  status: "new" | "done";
  name: string | null;
  email: string | null;
  userId: string | null;
  createdAt: string;
}
interface FeedbackList {
  total: number;
  open: number;
  averageRating: number | null;
  ratings: Record<string, number>;
  items: FeedbackItem[];
}

const DEVICE = { phone: "📱 Phone", tablet: "📱 Tablet", desktop: "💻 Computer" } as const;
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
function ago(d: string): string {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** What visitors sent through the Feedback button: ratings at a glance, then every message. */
export function FeedbackAdmin({ onOpenCustomer }: { onOpenCustomer?: (id: string) => void }) {
  const [data, setData] = useState<FeedbackList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState<"new" | "done" | "all">("new");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await adminGet<FeedbackList>("/feedback"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load feedback");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: "new" | "done") {
    setBusy(id);
    try {
      await adminPatch(`/feedback/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update it");
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-500">Loading…</p>;

  const rated = Object.values(data.ratings).reduce((s, n) => s + n, 0);
  const items = data.items.filter((f) => show === "all" || f.status === show);

  return (
    <div data-clarity-mask="true" className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Average rating</p>
          <p className="mt-1 font-display text-4xl font-bold text-white">
            {data.averageRating ?? "—"}
            {data.averageRating !== null && <span className="ml-1 text-2xl text-yellow-400">★</span>}
          </p>
          <p className="text-xs text-neutral-400">
            from {rated} rating{rated === 1 ? "" : "s"} · {data.total} message{data.total === 1 ? "" : "s"} in all
          </p>
        </div>
        <div className="card space-y-1.5 p-5" role="list" aria-label="Ratings breakdown">
          {[5, 4, 3, 2, 1].map((s) => {
            const n = data.ratings[s] ?? 0;
            return (
              <div key={s} role="listitem" className="flex items-center gap-3 text-xs">
                <span className="w-16 shrink-0 text-yellow-400">{stars(s)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-accent" style={{ width: rated ? `${(n / rated) * 100}%` : "0%" }} />
                </div>
                <span className="w-6 text-right tabular-nums text-neutral-300">{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["new", `To look at (${data.open})`],
            ["done", "Done"],
            ["all", "All"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setShow(k)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${show === k ? "bg-accent text-white" : "border border-white/10 text-neutral-300 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {items.length === 0 && (
        <p className="card p-8 text-center text-sm text-neutral-500">
          {show === "new" ? "Nothing new — you're all caught up." : "No feedback here yet."}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((f) => (
          <li key={f.id} className={`card p-5 ${f.status === "done" ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
              {f.rating ? <span className="text-sm text-yellow-400" aria-label={`${f.rating} out of 5`}>{stars(f.rating)}</span> : <span>No rating</span>}
              <span>{ago(f.createdAt)}</span>
              <span>{DEVICE[f.device]}</span>
              <a href={f.page} target="_blank" rel="noopener noreferrer" className="text-accent-soft underline">
                {f.page}
              </a>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-100">{f.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-auto text-neutral-400">
                {f.name || f.email ? (
                  <>
                    From {f.name ?? f.email}
                    {f.userId && <span className="text-neutral-500"> (has an account)</span>}
                  </>
                ) : (
                  "From a guest (no contact details)"
                )}
              </span>
              {f.email && (
                <a
                  href={`mailto:${f.email}?subject=${encodeURIComponent("Your feedback on Dark Music Yard")}`}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:border-accent hover:text-white"
                >
                  Reply by email
                </a>
              )}
              {f.userId && onOpenCustomer && (
                <button
                  type="button"
                  onClick={() => onOpenCustomer(f.userId!)}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:border-accent hover:text-white"
                >
                  View customer
                </button>
              )}
              <button
                type="button"
                disabled={busy === f.id}
                onClick={() => setStatus(f.id, f.status === "new" ? "done" : "new")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${f.status === "new" ? "bg-accent text-white" : "border border-white/15 text-neutral-300"}`}
              >
                {f.status === "new" ? "✓ Mark done" : "Reopen"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
