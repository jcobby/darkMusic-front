import Link from "next/link";
import { fanRewards, monthlyPrize } from "@/config/site";

/**
 * DMY Fan Rewards: the monthly fan appreciation prize — GH₵1,000 to the top of the Beat
 * Breaker fan rankings, sponsored by DMY and free to enter — with the monthly music trivia beside it.
 */
export function FanRewardsCard({ triviaPrizeGhs, className = "" }: { triviaPrizeGhs: number; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-accent/40 bg-gradient-to-br from-accent-deep/60 via-ink-700/85 to-ink-800/90 p-5 sm:p-7 ${className}`}
    >
      {/* A faint brick wall behind it */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(#bf00ff 1px, transparent 1px), linear-gradient(90deg, #bf00ff 1px, transparent 1px), linear-gradient(90deg, #bf00ff 1px, transparent 1px)",
          backgroundSize: "100% 16px, 36px 32px, 36px 32px",
          backgroundPosition: "0 0, 0 0, 18px 16px",
        }}
      />
      <div className="relative">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent">
          {fanRewards.name} {fanRewards.icons}
        </p>
        <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Beat Breaker — play to Lenko Psycho&apos;s music 🎵</p>
        <p className="mt-2 text-base text-neutral-200">
          Each month we appreciate our most dedicated fans with a <b className="text-yellow-300">{monthlyPrize} fan appreciation prize</b>, sponsored by
          Dark Music Yard.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-neutral-200">
          <li>🎵 Play Beat Breaker for free — the bricks break to DMY beats and Lenko Psycho songs.</li>
          <li>📈 Sign in, and your best game each day counts towards the monthly fan rankings.</li>
          <li>🏆 The fan on top when the month ends receives the prize, after a 48-hour score check.</li>
        </ul>
        <p className="mt-3 text-sm text-neutral-300">
          Our way of saying thank you for supporting Dark Music Yard and Lenko Psycho. The full rules are on the{" "}
          <Link href="/games/leaderboard" className="font-semibold text-white underline-offset-2 hover:underline">
            fan rankings page
          </Link>
          .
        </p>
        <p className="mt-3 inline-block rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-white">
          {fanRewards.free} {fanRewards.where}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href="/games/beat-breaker" className="btn-accent min-h-[48px]">
            Play free →
          </Link>
          <Link href="/games/leaderboard" className="btn-outline min-h-[44px] text-sm">
            Fan rankings &amp; rules
          </Link>
        </div>
        <p className="mt-4 border-t border-white/10 pt-3 text-xs text-neutral-400">
          Also in {fanRewards.name}:{" "}
          <Link href="/games/lenko-trivia" className="font-semibold text-yellow-300 hover:underline">
            🧠 Lenko Army Music Trivia — GH₵{triviaPrizeGhs.toLocaleString()} fan appreciation prize
          </Link>
        </p>
        <p className="mt-3 font-display text-sm font-bold text-white">{fanRewards.tagline}</p>
      </div>
    </div>
  );
}
