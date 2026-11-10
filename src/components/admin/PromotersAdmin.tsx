"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminGet, adminPost, adminPut } from "@/lib/adminApi";

type Kind = "device" | "phone" | "momo";
interface Person {
  id: string;
  name: string | null;
  email: string;
}
interface Row extends Person {
  code: string | null;
  profilePhone: string | null;
  phone?: string | null; // confirmed by a texted code (missing on a backend from before the phone step)
  joinedAt: string;
  card: { status: "pending" | "approved" | "rejected"; masked: string; note: string | null; submittedAt: string; reviewedAt: string | null; photoUrl: string | null } | null;
  status: "active" | "disqualified";
  reason: string | null;
  manual: boolean;
  links: { kind: Kind; at: string; cleared: boolean; other: Person }[];
  momo: { network: string; number: string; accountName: string } | null;
  clicks: number;
  ips: number;
  rejected: Record<string, number>;
  rewardGhs: number;
  eligible: boolean;
  paidAt: string | null;
  paidGhs: number | null;
  paidNote: string | null;
}
interface Data {
  month: string;
  ended: boolean;
  months: string[];
  settings: { open: boolean; targets?: string[]; target?: string }; // `target`: a backend from before the list
  tiers: { clicks: number; ghs: number }[];
  ipDailyCap: number;
  cardReady: boolean;
  totals: { promoters: number; cardsToCheck: number; disqualified: number; clicks: number; hit: Record<string, number>; payoutGhs: number; paidGhs: number };
  rows: Row[];
}

const KIND: Record<Kind, string> = { device: "same phone/computer", phone: "same phone number", momo: "same MoMo number" };
const REJECTED: Record<string, string> = { repeat: "repeat visitors", own: "their own", ip: "over the daily cap", bot: "bots/previews", noid: "no browser id" };
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const num = (n: number) => n.toLocaleString("en-US");
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Lenko Army promoters: clicks per month, who qualifies, duplicate accounts, payouts and the export. */
export function PromotersAdmin() {
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState<"all" | "eligible" | "cards">("all");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await adminGet<Data>(`/promoters${month ? `?month=${month}` : ""}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load promoters");
    }
  }, [month]);
  useEffect(() => {
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "That didn't work");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!data) return;
    const rows = data.rows.filter((r) => r.eligible);
    const head = ["Month", "Reward tier", "Amount (GHS)", "Clicks", "Name", "Email", "Ghana Card", "Confirmed phone", "Profile phone", "MoMo network", "MoMo number", "Name on MoMo", "Different connections", "Paid"];
    const lines = rows.map((r) =>
      [
        data.month,
        `${num([...data.tiers].sort((a, b) => b.clicks - a.clicks).find((t) => r.clicks >= t.clicks)?.clicks ?? 0)} clicks`,
        r.rewardGhs,
        r.clicks,
        r.name ?? "",
        r.email,
        r.card?.masked ?? "",
        r.phone ?? "",
        r.profilePhone ?? "",
        r.momo?.network ?? "",
        r.momo?.number ?? "",
        r.momo?.accountName ?? "",
        r.ips,
        r.paidAt ? `Paid ${new Date(r.paidAt).toLocaleDateString("en-GB")}` : "",
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([`﻿${[head.map(csvCell).join(","), ...lines].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lenko-army-promoters-${data.month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (error && !data) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-500">Loading…</p>;
  const tiersUp = [...data.tiers].sort((a, b) => a.clicks - b.clicks);
  const rows = show === "eligible" ? data.rows.filter((r) => r.eligible) : show === "cards" ? data.rows.filter((r) => r.card?.status === "pending") : data.rows;
  return (
    <div className="space-y-6">
      <Settings data={data} onSaved={load} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs text-neutral-400">
          Month
          <select className="input mt-1 w-auto" value={data.month} onChange={(e) => setMonth(e.target.value)}>
            {data.months.map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-neutral-400">
            Show
            <select className="input mt-1 w-auto" value={show} onChange={(e) => setShow(e.target.value as typeof show)}>
              <option value="all">Everyone</option>
              <option value="cards">Ghana Cards to check ({data.totals.cardsToCheck})</option>
              <option value="eligible">Only those who qualify</option>
            </select>
          </label>
          <button type="button" onClick={exportCsv} className="btn-accent min-h-[44px] text-sm" disabled={!data.rows.some((r) => r.eligible)}>
            ⬇ Export payout list (CSV)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Promoters"
          value={num(data.totals.promoters)}
          note={
            [data.totals.cardsToCheck > 0 && `🪪 ${data.totals.cardsToCheck} card${data.totals.cardsToCheck === 1 ? "" : "s"} to check`, data.totals.disqualified > 0 && `${data.totals.disqualified} disqualified`]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
        <Stat label={`Clicks · ${monthName(data.month)}`} value={num(data.totals.clicks)} />
        {tiersUp.map((t) => (
          <Stat key={t.clicks} label={`Reached ${num(t.clicks)}`} value={num(data.totals.hit[String(t.clicks)] ?? 0)} note={`GH₵${t.ghs} each`} />
        ))}
        <Stat
          label={data.ended ? "To pay" : "To pay so far"}
          value={`GH₵${num(data.totals.payoutGhs)}`}
          note={data.totals.paidGhs ? `GH₵${num(data.totals.paidGhs)} marked paid` : data.ended ? undefined : "month still running"}
        />
      </div>

      {rows.length === 0 ? (
        <p className="card p-6 text-center text-sm text-neutral-500">{show === "eligible" ? "Nobody has reached a reward this month." : show === "cards" ? "No Ghana Cards waiting ✓" : "No promoters yet — members appear here once they confirm their phone or send their Ghana Card."}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className={`card p-4 text-sm ${r.status === "disqualified" ? "border-red-500/30" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {r.name || r.email}{" "}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${r.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                      {r.status === "active" ? "Active" : "Disqualified"}
                    </span>
                  </p>
                  <p className="text-xs text-neutral-400">
                    {r.email}
                    {r.profilePhone && ` · phone ${r.profilePhone}`} · link /r/{r.code}
                  </p>
                  <p className={`text-xs ${r.phone ? "text-emerald-300" : "text-yellow-300"}`}>
                    {r.phone ? `📱 Phone ${r.phone} confirmed by text` : "📱 Phone not confirmed yet — no reward until they do"}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {r.momo ? `Pays to ${r.momo.network} ${r.momo.number} (${r.momo.accountName})` : "No Mobile Money details yet"}
                  </p>
                  {r.reason && <p className="mt-1 text-xs text-red-300">{r.reason}</p>}
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-white">{num(r.clicks)}</p>
                  <p className="text-xs text-neutral-400">
                    clicks · from {num(r.ips)} connection{r.ips === 1 ? "" : "s"}
                  </p>
                  {r.rewardGhs > 0 && <p className={`text-xs font-bold ${r.eligible ? "text-yellow-300" : "text-neutral-500 line-through"}`}>GH₵{r.rewardGhs}</p>}
                </div>
              </div>

              <CardCheck r={r} busy={busy} act={act} />

              {Object.values(r.rejected).some(Boolean) && (
                <p className="mt-2 text-[11px] text-neutral-500">
                  Not counted:{" "}
                  {Object.entries(r.rejected)
                    .filter(([, n]) => n)
                    .map(([k, n]) => `${num(n)} ${REJECTED[k] ?? k}`)
                    .join(" · ")}
                </p>
              )}

              {r.links.length > 0 && (
                <ul className="mt-2 space-y-1 rounded-xl border border-white/10 bg-white/[0.02] p-2 text-xs">
                  {r.links.map((l) => (
                    <li key={`${l.kind}:${l.other.id}`} className="flex flex-wrap items-center justify-between gap-2">
                      <span className={l.cleared ? "text-neutral-500" : "text-red-200"}>
                        ⚠ {KIND[l.kind]} as <b>{l.other.name || l.other.email}</b> ({l.other.email}){l.cleared && " — cleared"}
                      </span>
                      {!l.cleared && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirm(`Clear this? Only if you've checked that ${r.name || r.email} and ${l.other.name || l.other.email} are different people.`) &&
                            act(() => adminPost(`/promoters/${r.id}/clear`, { other: l.other.id }))
                          }
                          className="rounded-full border border-white/15 px-2.5 py-1 text-neutral-300 hover:border-white"
                        >
                          Different people — clear
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {r.status === "active" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const reason = prompt("Why? (they'll see this)", "Disqualified by DMY");
                      if (reason !== null) void act(() => adminPost(`/promoters/${r.id}/status`, { action: "disqualify", reason }));
                    }}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-300 hover:border-red-400 hover:text-red-300"
                  >
                    Disqualify
                  </button>
                ) : (
                  r.manual && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(() => adminPost(`/promoters/${r.id}/status`, { action: "reinstate" }))}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-300 hover:border-emerald-400"
                    >
                      Reinstate
                    </button>
                  )
                )}
                {data.ended &&
                  r.eligible &&
                  (r.paidAt ? (
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 font-bold text-emerald-300">
                        GH₵{r.paidGhs} paid ✓{r.paidNote ? ` · ${r.paidNote}` : ""}
                      </span>
                      <button type="button" disabled={busy} onClick={() => act(() => adminPost(`/promoters/${r.id}/paid`, { month: data.month, paid: false }))} className="text-neutral-500 hover:text-white">
                        Undo
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const note = prompt(`Mark GH₵${r.rewardGhs} as paid to ${r.name || r.email}? Add the MoMo reference if you like (they get an email and a text).`, "");
                        if (note !== null) void act(() => adminPost(`/promoters/${r.id}/paid`, { month: data.month, note }));
                      }}
                      className="rounded-full bg-accent px-3 py-1.5 font-bold text-white"
                    >
                      Mark GH₵{r.rewardGhs} paid
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-neutral-500">
        A visitor counts once a month per link (by their browser). Not counted: the member&apos;s own clicks, link previews and bots, and more than{" "}
        {data.ipDailyCap} a day from one internet connection. Few connections for many clicks is worth a look before paying. Accounts sharing a phone number,
        a phone/computer or a MoMo number are disqualified automatically (checked again every hour) — clear them only after you&apos;ve checked. Rewards
        need a phone confirmed by text and an approved Ghana Card (one of each per account), so they&apos;re for fans in Ghana.
      </p>
    </div>
  );
}

const CARD_PILL = {
  pending: "bg-yellow-400/15 text-yellow-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
} as const;

/** Their Ghana Card: the photo to compare with the number while it waits, then approve or turn it down. */
function CardCheck({ r, busy, act }: { r: Row; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const c = r.card;
  if (!c) return <p className="mt-2 text-xs text-neutral-500">🪪 No Ghana Card yet</p>;
  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
      <p className="flex flex-wrap items-center gap-2 text-neutral-300">
        🪪 Ghana Card <b className="font-mono text-white">{c.masked}</b>
        <span className={`rounded-full px-2 py-0.5 font-bold ${CARD_PILL[c.status]}`}>
          {c.status === "pending" ? "To check" : c.status === "approved" ? "Approved ✓" : "Turned down"}
        </span>
        {c.note && <span className="text-red-300">“{c.note}”</span>}
      </p>
      {c.status === "pending" && (
        <>
          {c.photoUrl ? (
            <a href={c.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.photoUrl} alt={`Ghana Card sent by ${r.name || r.email}`} className="max-h-56 rounded-lg border border-white/10 object-contain" />
            </a>
          ) : (
            <p className="mt-2 text-neutral-500">No photo</p>
          )}
          <p className="mt-2 text-neutral-500">
            Check: the number on the photo ends like {c.masked}, the name matches the account ({r.name || "no name on the account"}), and it&apos;s a real card. The
            photo is deleted once you decide; the link to it works for 30 minutes (reload the tab for a fresh one).
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => act(() => adminPost(`/promoters/${r.id}/card`, { action: "approve" }))} className="rounded-full bg-emerald-500 px-3 py-1.5 font-bold text-ink">
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const note = prompt("Why? They'll see this and can send it again (e.g. The photo is blurry — the number isn't readable)", "");
                if (note) void act(() => adminPost(`/promoters/${r.id}/card`, { action: "reject", note }));
              }}
              className="rounded-full border border-white/15 px-3 py-1.5 text-neutral-300 hover:border-red-400 hover:text-red-300"
            >
              Turn down
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
      {note && <p className="text-xs text-neutral-400">{note}</p>}
    </div>
  );
}

function Settings({ data, onSaved }: { data: Data; onSaved: () => void }) {
  const [targets, setTargets] = useState((data.settings.targets ?? (data.settings.target ? [data.settings.target] : [])).join("\n"));
  const [open, setOpen] = useState(data.settings.open);
  const [msg, setMsg] = useState<string | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await adminPut("/promoters/settings", { targets: targets.split(/\s+/).filter(Boolean), open });
      setMsg("Saved ✓");
      onSaved();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Couldn't save");
    }
  }
  return (
    <form onSubmit={save} className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-white">📣 Lenko Army promoters</h3>
        {!data.cardReady && (
          <span className="rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-semibold text-yellow-300">Ghana Card photos need Cloudinary set up on Render</span>
        )}
      </div>
      <label className="block text-xs text-neutral-400">
        Links go to (YouTube videos or a channel, one per line — each visitor is sent to one of them at random)
        <textarea
          className="input mt-1 min-h-[120px] font-mono text-xs"
          value={targets}
          onChange={(e) => setTargets(e.target.value)}
          placeholder={"https://www.youtube.com/watch?v=…\nhttps://www.youtube.com/watch?v=…"}
          required
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Counting clicks (untick to pause the program)
        </label>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-neutral-300">{msg}</span>}
          <button type="submit" className="btn-accent min-h-[40px] text-sm">
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
