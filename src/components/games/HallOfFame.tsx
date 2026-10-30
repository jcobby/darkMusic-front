import Link from "next/link";
import type { PrizePool } from "@/lib/api";

const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The Hall of Fame: each month's Beat Breaker champion — last month's up top, crowned —
 * and the ones before. (Server-rendered from the prize pool's past winners.)
 */
export function HallOfFame({ winners, className = "" }: { winners: PrizePool["winners"]; className?: string }) {
  const [latest, ...earlier] = winners;
  return (
    <section className={`card overflow-hidden ${className}`} aria-labelledby="hall-of-fame">
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-yellow-400/15 via-transparent to-transparent px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">Beat Breaker · monthly champions</p>
        <h2 id="hall-of-fame" className="mt-1 font-display text-2xl font-bold text-white">
          🏆 Hall of Fame
        </h2>
      </div>
      {!latest ? (
        <div className="p-5 text-sm text-neutral-300">
          The first champion is crowned when this month ends. Top the board and yours is the first name here.{" "}
          <Link href="/games/beat-breaker" className="font-semibold text-accent-soft underline">
            Play Beat Breaker →
          </Link>
        </div>
      ) : (
        <div className="p-5">
          <div className="relative overflow-hidden rounded-2xl border border-yellow-400/50 bg-gradient-to-br from-yellow-400/15 to-transparent p-5 shadow-[0_0_30px_rgba(250,204,21,0.12)]">
            <span aria-hidden className="pointer-events-none absolute -right-3 -top-4 select-none text-7xl opacity-20">
              👑
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-300">{monthName(latest.month)} champion</p>
            <p className="mt-1 font-display text-3xl font-bold text-white">{latest.name}</p>
            <p className="mt-1 text-sm text-neutral-300">
              {latest.score !== null && (
                <>
                  <b className="tabular-nums text-white">{latest.score.toLocaleString()}</b> points ·{" "}
                </>
              )}
              won <b className="text-yellow-300">GH₵{latest.amountGhs.toLocaleString()}</b>
            </p>
          </div>
          {earlier.length > 0 && (
            <ol className="mt-3 divide-y divide-white/[0.05]">
              {earlier.map((w) => (
                <li key={w.month} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-neutral-400">{monthName(w.month)}</span>
                  <span className="min-w-0 flex-1 truncate text-right font-semibold text-white">🏆 {w.name}</span>
                  <span className="w-20 shrink-0 text-right tabular-nums text-neutral-300">GH₵{w.amountGhs.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
