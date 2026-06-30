"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet, adminPatch } from "@/lib/adminApi";

interface Inquiry {
  _id: string;
  type: "feature" | "brand" | "contact";
  name: string;
  email: string;
  phone?: string;
  artistName?: string;
  songLink?: string;
  budget?: string;
  deadline?: string;
  businessName?: string;
  service?: string;
  message?: string;
  status: "new" | "read" | "archived";
  createdAt: string;
}

interface Order {
  _id: string;
  reference: string;
  customerEmail: string;
  totalGhs: number;
  status: string;
  items: { name: string; qty: number; amountGhs: number }[];
  createdAt: string;
}

interface Donation {
  _id: string;
  reference: string;
  name?: string;
  email: string;
  amountGhs: number;
  message?: string;
  status: string;
  createdAt: string;
}

type Row = Inquiry | Order | Donation;

export function InboxAdmin({ kind }: { kind: "inquiries" | "orders" | "donations" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminGet<Row[]>(`/${kind}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    await adminPatch(`/inquiries/${id}`, { status });
    await load();
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (rows.length === 0)
    return <p className="card p-8 text-center text-sm text-neutral-500">Nothing here yet.</p>;

  if (kind === "donations") {
    const total = (rows as Donation[])
      .filter((d) => d.status === "paid")
      .reduce((s, d) => s + d.amountGhs, 0);
    return (
      <>
        <p className="mb-4 text-sm text-neutral-400">
          Total received: <span className="font-bold text-accent">GH₵{total.toLocaleString()}</span>
        </p>
        <ul className="space-y-3">
          {(rows as Donation[]).map((d) => (
            <li key={d._id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{d.name || "Anonymous"}</p>
                  <p className="text-xs text-neutral-500">
                    {d.email} · {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-accent">GH₵{d.amountGhs}</p>
                  <StatusPill status={d.status} />
                </div>
              </div>
              {d.message && (
                <p className="mt-3 border-t border-ink-600 pt-2 text-sm text-neutral-300">
                  “{d.message}”
                </p>
              )}
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (kind === "orders") {
    return (
      <ul className="space-y-3">
        {(rows as Order[]).map((o) => (
          <li key={o._id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{o.reference}</p>
                <p className="text-xs text-neutral-500">
                  {o.customerEmail} · {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-accent">GH₵{o.totalGhs}</p>
                <StatusPill status={o.status} />
              </div>
            </div>
            <ul className="mt-3 border-t border-ink-600 pt-2 text-sm text-neutral-400">
              {o.items.map((it, i) => (
                <li key={i}>
                  {it.name} × {it.qty} — GH₵{it.amountGhs * it.qty}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-3">
      {(rows as Inquiry[]).map((q) => (
        <li key={q._id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="rounded-full bg-ink-600 px-2 py-0.5 text-[11px] font-medium uppercase text-accent">
                {q.type}
              </span>
              <span className="ml-2 font-semibold text-white">
                {q.artistName || q.businessName || q.name}
              </span>
              <p className="text-xs text-neutral-500">
                {q.email}
                {q.phone ? ` · ${q.phone}` : ""} · {new Date(q.createdAt).toLocaleString()}
              </p>
            </div>
            <StatusPill status={q.status} />
          </div>

          <dl className="mt-3 grid gap-x-6 gap-y-1 border-t border-ink-600 pt-3 text-sm sm:grid-cols-2">
            {q.songLink && <Detail label="Song" value={q.songLink} link />}
            {q.service && <Detail label="Service" value={q.service} />}
            {q.budget && <Detail label="Budget" value={q.budget} />}
            {q.deadline && <Detail label="Deadline" value={q.deadline} />}
            {q.message && <Detail label="Message" value={q.message} wide />}
          </dl>

          <div className="mt-3 flex gap-2">
            <button onClick={() => setStatus(q._id, "read")} className="btn-ghost text-xs">
              Mark read
            </button>
            <button onClick={() => setStatus(q._id, "archived")} className="btn-ghost text-xs">
              Archive
            </button>
            <a href={`mailto:${q.email}`} className="btn-outline px-3 py-1.5 text-xs">
              Reply
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Detail({
  label,
  value,
  link,
  wide,
}: {
  label: string;
  value: string;
  link?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="text-neutral-200">
        {link ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-accent break-all">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "paid"
      ? "text-emerald-400"
      : status === "failed"
      ? "text-red-400"
      : status === "new"
      ? "text-accent"
      : "text-neutral-400";
  return <span className={`text-xs font-semibold capitalize ${color}`}>{status}</span>;
}
