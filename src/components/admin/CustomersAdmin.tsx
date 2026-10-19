"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet } from "@/lib/adminApi";

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  joinedAt: string;
  lastSeenAt: string | null;
  lastCheckIn: string | null;
  points: number;
  streak: number;
  referred: boolean;
  spentGhs: number;
  purchases: number;
  tips: number;
  games: number;
  bestScore: number;
  bids: number;
  bookings: number;
  posts: number;
  feedback: number;
}
interface CustomerList {
  summary: {
    accounts: number;
    confirmed: number;
    joinedThisWeek: number;
    activeThisWeek: number;
    paying: number;
    players: number;
    spentGhs: number;
  };
  page: number;
  pageSize: number;
  total: number;
  customers: Customer[];
}
interface CustomerEvent {
  at: string;
  kind: "joined" | "purchase" | "tip" | "pass" | "ticket" | "bid" | "booking" | "game" | "prize" | "withdrawal" | "post" | "feedback";
  text: string;
  amountGhs?: number;
}
interface CustomerDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  joinedAt: string;
  lastSeenAt: string | null;
  points: number;
  streak: number;
  lastCheckIn: string | null;
  referralCode: string;
  streamUntil: string | null;
  counts: { favorites: number; votes: number; ratings: number };
  spentGhs: number;
  events: CustomerEvent[];
}

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "active", label: "Last seen" },
  { key: "spent", label: "Spent the most" },
  { key: "games", label: "Played the most" },
  { key: "points", label: "Most points" },
] as const;

const ICON: Record<CustomerEvent["kind"], string> = {
  joined: "👋",
  purchase: "🛍️",
  tip: "💜",
  pass: "🎧",
  ticket: "🎟️",
  bid: "🔨",
  booking: "📸",
  game: "🎮",
  prize: "🏆",
  withdrawal: "💸",
  post: "💬",
  feedback: "📝",
};

const money = (n: number) => `GH₵${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const day = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
function ago(d: string | null): string {
  if (!d) return "—";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
  return day(d);
}
const waLink = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `233${digits.slice(1)}` : digits}`;
};

/**
 * Every account and what they've done on the site. Click someone for their full
 * history. `openId` opens a customer directly (e.g. from a feedback message).
 */
export function CustomersAdmin({ openId, onOpenChange }: { openId?: string | null; onOpenChange?: (id: string | null) => void }) {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("newest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomerList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(openId ?? null);

  useEffect(() => setSelected(openId ?? null), [openId]);
  const select = (id: string | null) => {
    setSelected(id);
    onOpenChange?.(id);
  };

  // Search as you type (after a short pause)
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ q: query, sort, page: String(page) });
      setData(await adminGet<CustomerList>(`/customers?${p}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load customers");
    }
  }, [query, sort, page]);
  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div data-clarity-mask="true" className="space-y-5">
      {s && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label={query ? "Matching accounts" : "Accounts"} value={s.accounts.toLocaleString()} note={`${s.confirmed} confirmed their email`} />
          <Stat label="Joined this week" value={s.joinedThisWeek.toLocaleString()} />
          <Stat label="On the site this week" value={s.activeThisWeek.toLocaleString()} note="signed in" />
          <Stat label="Paying customers" value={s.paying.toLocaleString()} note={`${money(s.spentGhs)} in total`} />
          <Stat label="Game players" value={s.players.toLocaleString()} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email or phone"
          className="input max-w-sm flex-1"
          aria-label="Search customers"
        />
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as typeof sort);
            setPage(1);
          }}
          className="input w-auto"
          aria-label="Sort customers"
        >
          {SORTS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!data && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {data && data.customers.length === 0 && <p className="card p-8 text-center text-sm text-neutral-500">No customers found.</p>}

      {data && data.customers.length > 0 && (
        <ul className="space-y-2">
          {data.customers.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => select(c.id)}
                className="card w-full p-4 text-left transition hover:border-accent/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{c.name || c.email}</p>
                    <p className="truncate text-xs text-neutral-400">
                      {c.email}
                      {c.phone && ` · ${c.phone}`}
                    </p>
                  </div>
                  <p className={`text-sm font-bold ${c.spentGhs > 0 ? "text-accent-soft" : "text-neutral-600"}`}>{money(c.spentGhs)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
                  <span className={c.emailVerified ? "text-emerald-300" : "text-yellow-300"}>{c.emailVerified ? "✓ Email confirmed" : "Email not confirmed"}</span>
                  <span>Joined {day(c.joinedAt)}</span>
                  <span>Last seen {ago(c.lastSeenAt)}</span>
                  {c.games > 0 && (
                    <span>
                      🎮 {c.games} game{c.games === 1 ? "" : "s"} · best {c.bestScore.toLocaleString()}
                    </span>
                  )}
                  {c.purchases > 0 && <span>🛍️ {c.purchases}</span>}
                  {c.tips > 0 && <span>💜 {c.tips} tip{c.tips === 1 ? "" : "s"}</span>}
                  {c.bids > 0 && <span>🔨 {c.bids} bid{c.bids === 1 ? "" : "s"}</span>}
                  {c.bookings > 0 && <span>📸 {c.bookings} booking{c.bookings === 1 ? "" : "s"}</span>}
                  {c.posts > 0 && <span>💬 {c.posts} post{c.posts === 1 ? "" : "s"}</span>}
                  {c.feedback > 0 && <span>📝 {c.feedback} feedback</span>}
                  <span>⭐ {c.points} pts</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {data && pages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-400">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-outline px-4 py-2 disabled:opacity-40">
            ← Previous
          </button>
          <span>
            {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-outline px-4 py-2 disabled:opacity-40">
            Next →
          </button>
        </div>
      )}

      {selected && <CustomerPanel id={selected} onClose={() => select(null)} />}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
      {note && <p className="mt-0.5 text-xs text-neutral-400">{note}</p>}
    </div>
  );
}

/** One customer: contact details, numbers, and everything they've done, newest first. */
function CustomerPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [c, setC] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setC(null);
    adminGet<CustomerDetail>(`/customers/${id}`)
      .then(setC)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this customer"));
  }, [id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Customer"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        data-clarity-mask="true"
        className="card relative max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-6 sm:max-w-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!c && !error && <p className="text-sm text-neutral-500">Loading…</p>}
        {c && (
          <>
            <h2 className="pr-10 font-display text-2xl font-bold text-white">{c.name || c.email}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <a href={`mailto:${c.email}`} className="text-accent-soft underline">
                {c.email}
              </a>
              {c.phone && (
                <>
                  <a href={`tel:${c.phone}`} className="text-neutral-300 underline">
                    {c.phone}
                  </a>
                  <a href={waLink(c.phone)} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">
                    WhatsApp
                  </a>
                </>
              )}
              <span className={c.emailVerified ? "text-emerald-300" : "text-yellow-300"}>{c.emailVerified ? "✓ Email confirmed" : "Email not confirmed"}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Mini label="Joined" value={day(c.joinedAt)} />
              <Mini label="Last seen" value={ago(c.lastSeenAt)} />
              <Mini label="Spent" value={money(c.spentGhs)} />
              <Mini label="Points" value={`${c.points}${c.streak > 1 ? ` · ${c.streak}-day streak` : ""}`} />
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              {c.counts.favorites} favourite{c.counts.favorites === 1 ? "" : "s"} · {c.counts.votes} contest vote
              {c.counts.votes === 1 ? "" : "s"} · {c.counts.ratings} video rating{c.counts.ratings === 1 ? "" : "s"}
              {c.lastCheckIn && ` · last daily check-in ${c.lastCheckIn}`}
              {c.streamUntil && new Date(c.streamUntil) > new Date() && ` · streaming pass until ${day(c.streamUntil)}`}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Account ID (search it in Clarity to watch their visits):{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-neutral-300">{c.id}</code>{" "}
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(c.id).then(() => setCopied(true));
                }}
                className="text-accent-soft underline"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </p>

            <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Activity</h3>
            <ol className="mt-3 space-y-2">
              {c.events.map((e, i) => (
                <li key={i} className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <span aria-hidden className="text-lg leading-6">
                    {ICON[e.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-200">{e.text}</p>
                    <p className="text-xs text-neutral-500">{new Date(e.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  {e.amountGhs !== undefined && e.amountGhs !== null && (
                    <span className="shrink-0 text-sm font-semibold text-white">{money(e.amountGhs)}</span>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
