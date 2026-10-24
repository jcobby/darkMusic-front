"use client";

import { useCallback, useEffect, useState } from "react";
import { adminDelete, adminGet } from "@/lib/adminApi";

interface AdminSquad {
  id: string;
  name: string;
  tag: string;
  createdAt: string;
  members: { name: string; email: string | null; captain: boolean; score: number }[];
}

/** Every squad and its members — close one with an offensive name (its members can then join another). */
export function SquadsAdmin() {
  const [squads, setSquads] = useState<AdminSquad[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSquads(await adminGet<AdminSquad[]>("/squads"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function close(s: AdminSquad) {
    if (!confirm(`Close the squad ${s.name} [${s.tag}]? Its ${s.members.length} members can join or start another straight away.`)) return;
    try {
      await adminDelete(`/squads/${s.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't close it");
    }
  }

  return (
    <section className="card p-5">
      <h3 className="font-semibold text-white">👥 Squads ({squads.length})</h3>
      <p className="mt-1 text-sm text-neutral-400">Fans name their own squads and tags — close any that break the rules.</p>
      {error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {squads.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">No squads yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.05] text-sm">
          {squads.map((s) => (
            <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-white">
                  <b>{s.name}</b> <span className="text-xs text-neutral-400">[{s.tag}]</span>
                  <span className="ml-2 text-xs text-neutral-500">
                    {s.members.length} member{s.members.length === 1 ? "" : "s"} · {s.members.reduce((t, m) => t + m.score, 0).toLocaleString()} pts this month
                  </span>
                </p>
                <p className="text-xs text-neutral-500">
                  {s.members.map((m) => `${m.name}${m.captain ? " (captain)" : ""}${m.email ? ` <${m.email}>` : ""}`).join(" · ")}
                </p>
              </div>
              <button type="button" onClick={() => close(s)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-300 hover:border-red-400 hover:text-red-300">
                Close
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
