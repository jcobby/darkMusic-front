"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createSquad, getSquadInvite, getSquads, joinSquad, leaveSquad, removeFromSquad, type SquadBoard } from "@/lib/api";
import { site } from "@/config/site";
import { getFanToken, useFanAuth } from "../FanAuthProvider";
import { monthName, timeLeft } from "./LeaderboardParts";

const pts = (n: number) => n.toLocaleString("en-US");
const lastMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
};

/**
 * Squads: your squad (members, invite link, captain's controls), starting or joining
 * one, and the squad board — each squad's members' Beat Breaker month totals added up.
 */
export function SquadsView() {
  const { user, loading: authLoading } = useFanAuth();
  const [last, setLast] = useState(false);
  const [data, setData] = useState<SquadBoard | null>(null);
  const [invite, setInvite] = useState<{ code: string; name: string; tag: string; members: number; full: boolean } | null>(null);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setData(await getSquads(getFanToken(), last ? lastMonth() : undefined));
  }, [last]);
  useEffect(() => {
    void load();
  }, [load, user?.id]);

  // Opened from an invite link (?join=CODE)
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("join");
    if (!c) return;
    setCode(c.toUpperCase());
    getSquadInvite(c).then((i) => i && setInvite({ code: c.toUpperCase(), ...i }));
  }, []);

  async function act(fn: (token: string) => Promise<unknown>) {
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await fn(token);
      setInvite(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  const create = (e: FormEvent) => {
    e.preventDefault();
    void act((t) => createSquad(t, name, tag));
  };
  const join = (e?: FormEvent) => {
    e?.preventDefault();
    void act((t) => joinSquad(t, code));
  };

  const mine = data?.mine;
  const link = mine ? `${site.url}/games/squads?join=${mine.code}` : "";
  const myRank = mine && data?.board.find((s) => s.id === mine.id)?.rank;
  const shareText = mine ? `Join my squad ${mine.name} [${mine.tag}] on Dark Music Yard — our Beat Breaker scores add up. ${link}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      {/* Your squad — or start / join one */}
      {!user ? (
        !authLoading && (
          <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-semibold text-white">{invite ? `You're invited to ${invite.name} [${invite.tag}]` : "Squad up with the Lenko Army"}</p>
              <p className="text-sm text-neutral-400">Sign in to start a squad or join one — your Beat Breaker scores add up together.</p>
            </div>
            <Link href={`/account?next=${encodeURIComponent(invite ? `/games/squads?join=${invite.code}` : "/games/squads")}`} className="btn-accent min-h-[44px] text-sm">
              Sign in
            </Link>
          </div>
        )
      ) : mine ? (
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-accent-deep/60 to-transparent p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Your squad</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">
              {mine.name} <span className="text-base text-neutral-300">[{mine.tag}]</span>
            </p>
            <p className="mt-1 text-sm text-neutral-200">
              <b className="text-white">{pts(mine.score)}</b> pts this month
              {myRank ? ` · #${myRank} of ${data?.board.length}` : ""}
              {!mine.ranked && data && ` · ${data.min - mine.members.length} more member${data.min - mine.members.length === 1 ? "" : "s"} to go on the board`}
            </p>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {mine.members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0 truncate text-white">
                  {m.me ? <b>You</b> : m.name}
                  {m.captain && <span className="ml-2 text-xs text-yellow-300">captain</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-white">{pts(m.score)}</span>
                  {mine.captain && !m.me && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => confirm(`Remove ${m.name} from ${mine.name}?`) && act((t) => removeFromSquad(t, m.userId))}
                      className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-neutral-400 hover:border-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-3 border-t border-white/[0.06] p-5">
            {data && mine.members.length < data.max ? (
              <>
                <p className="text-sm text-neutral-300">
                  Invite up to {data.max - mine.members.length} more — code <b className="font-mono text-white">{mine.code}</b>
                </p>
                <div className="flex gap-2">
                  <input readOnly value={link} className="input flex-1 text-xs" />
                  <button type="button" onClick={copy} className="btn-outline shrink-0">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[44px]">
                    Share on WhatsApp
                  </a>
                  <a href={`https://twitter.com/intent/tweet?${new URLSearchParams({ text: shareText })}`} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[44px]">
                    Share on X
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-400">Your squad is full ({data?.max} members).</p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => confirm(`Leave ${mine.name}? You'll have to wait 3 days before joining another squad.`) && act(leaveSquad)}
              className="text-xs font-semibold text-neutral-500 hover:text-red-300"
            >
              Leave the squad
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data?.freeAt ? (
            <p className="card p-5 text-sm text-neutral-300 sm:col-span-2">
              You left a squad recently — you can join or start another from{" "}
              <b className="text-white">{new Date(data.freeAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</b>.
            </p>
          ) : null}
          <form onSubmit={join} className="card space-y-3 p-5">
            <p className="font-semibold text-white">{invite ? `Join ${invite.name} [${invite.tag}]` : "Join a squad"}</p>
            {invite && (
              <p className="text-xs text-neutral-400">{invite.full ? "This squad is full." : `${invite.members} member${invite.members === 1 ? "" : "s"} so far.`}</p>
            )}
            <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Invite code" maxLength={8} required />
            <button type="submit" disabled={busy || Boolean(data?.freeAt)} className="btn-accent min-h-[44px] w-full justify-center">
              Join
            </button>
          </form>
          <form onSubmit={create} className="card space-y-3 p-5">
            <p className="font-semibold text-white">Start a squad</p>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Squad name, e.g. LA Warriors" maxLength={24} required />
            <input className="input uppercase" value={tag} onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="Tag, e.g. LAW" maxLength={5} required />
            <button type="submit" disabled={busy || Boolean(data?.freeAt)} className="btn-accent min-h-[44px] w-full justify-center">
              Start it
            </button>
            <p className="text-xs text-neutral-500">The tag shows next to every member&apos;s name on the boards.</p>
          </form>
        </div>
      )}

      {/* The board */}
      <div className="flex gap-2" role="tablist">
        {[false, true].map((l) => (
          <button
            key={String(l)}
            type="button"
            role="tab"
            aria-selected={last === l}
            onClick={() => setLast(l)}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold transition ${last === l ? "bg-accent text-white" : "border border-white/10 text-neutral-300 hover:text-white"}`}
          >
            {l ? "Last month" : "This month"}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 text-xs text-neutral-400">
          <span>{data ? `${monthName(data.month)}${data.ended ? " · ended" : ` · ${timeLeft(data.endsAt)}`}` : "Squads"}</span>
          <span>Points</span>
        </div>
        {!data ? (
          <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>
        ) : data.board.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-400">No squads on the board yet — a squad needs {data.min} members.</p>
        ) : (
          <ol className="divide-y divide-white/[0.04]">
            {data.board.map((s) => (
              <li key={s.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5 ${mine?.id === s.id ? "bg-accent/15 ring-1 ring-inset ring-accent/50" : ""}`}>
                <span
                  className={`grid h-7 min-w-[1.75rem] shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                    s.rank === 1 ? "bg-accent text-white" : s.rank <= 3 ? "bg-white/15 text-white" : "bg-white/5 text-neutral-300"
                  }`}
                >
                  {s.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-white">
                  {s.name} <span className="text-xs font-bold text-neutral-400">[{s.tag}]</span>
                  <span className="ml-2 text-xs text-neutral-500">{s.members} members</span>
                </span>
                <span className="font-semibold tabular-nums text-white">{pts(s.score)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card p-5">
        <p className="mb-2 text-sm font-semibold text-white">How squads work</p>
        <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-400">
          <li>• A squad is {data?.min ?? 3}–{data?.max ?? 5} fans. Start one and send your invite link, or join with a friend&apos;s code. One squad at a time.</li>
          <li>• Your squad&apos;s score is its members&apos; Beat Breaker month totals added up — a squad goes on the board once it has {data?.min ?? 3} members.</li>
          <li>• Your squad&apos;s tag shows next to your name on every board. Bragging rights — no prize.</li>
          <li>• The captain (whoever started it) can remove members. Leave and you wait 3 days before joining another squad.</li>
        </ul>
        <Link href="/games/beat-breaker" className="btn-accent mt-4 min-h-[44px] text-sm">
          ▶ Play Beat Breaker
        </Link>
      </div>
    </div>
  );
}
