import Link from "next/link";
import type { BeatOfTheDay } from "@/lib/api";

/** Today's featured DMY beat: it opens every game, and its kicks score extra in Beat Breaker. */
export function BeatOfTheDayCard({ botd, className = "" }: { botd: BeatOfTheDay | null; className?: string }) {
  const beat = botd?.beat;
  if (!beat) return null;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-accent/40 bg-gradient-to-r from-accent/15 via-ink-700/80 to-ink-700/80 p-5 sm:p-6 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-4">
        {beat.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={beat.coverImage} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent/20 text-3xl" aria-hidden>
            🎧
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">🎧 Beat of the Day</p>
          <p className="mt-1 truncate font-display text-2xl font-bold text-white">{beat.title}</p>
          <p className="text-sm text-neutral-300">
            Opens every game today — in Beat Breaker, its kicks score <b className="text-yellow-300">×{botd.multiplier}</b> instead of ×2.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/games/beat-breaker" className="btn-accent min-h-[48px]">
          ▶ Play on it
        </Link>
        <Link href="/free-beats" className="btn-outline min-h-[48px]">
          Get it free
        </Link>
      </div>
    </div>
  );
}
