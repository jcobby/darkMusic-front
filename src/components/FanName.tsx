import type { Flair, NameColor } from "@/lib/api";

/** The name colours fans unlock (the backend's services/flair says how). */
export const NAME_COLOR_CLASS: Record<NameColor, string> = {
  purple: "text-accent",
  emerald: "text-emerald-300",
  gold: "text-yellow-300",
  sky: "text-sky-300",
};

/** A live check-in streak this long shows as 🔥 on the boards. */
const STREAK_BADGE_FROM = 7;

/** "🏆×2" — the count only once there's more than one. */
const times = (n: number) => (n > 1 ? `×${n}` : "");

/**
 * A fan's name as the boards show it: in the colour they picked, with their badges —
 * 🏆 Beat Breaker months won, 🏅 weekly boards topped, ⚡ events won, ⏱ daily sprints won, 🧠 Lenko Trivia right answers,
 * 🔥 a check-in streak of a week or more. Their Lenko Army rank is in the tooltip.
 */
export function FanName({ name, flair, className = "" }: { name: React.ReactNode; flair: Flair | null | undefined; className?: string }) {
  const badges: { icon: string; label: string }[] = [];
  if (flair) {
    if (flair.months) badges.push({ icon: `🏆${times(flair.months)}`, label: `Won ${flair.months} Beat Breaker month${flair.months === 1 ? "" : "s"}` });
    if (flair.weeks) badges.push({ icon: `🏅${times(flair.weeks)}`, label: `Topped ${flair.weeks} weekly board${flair.weeks === 1 ? "" : "s"}` });
    if (flair.events) badges.push({ icon: `⚡${times(flair.events)}`, label: `Won ${flair.events} event${flair.events === 1 ? "" : "s"}` });
    if (flair.sprints) badges.push({ icon: `⏱${times(flair.sprints)}`, label: `Topped ${flair.sprints} daily sprint board${flair.sprints === 1 ? "" : "s"}` });
    if (flair.trivia) badges.push({ icon: `🧠${times(flair.trivia)}`, label: `${flair.trivia} Lenko Trivia answer${flair.trivia === 1 ? "" : "s"} right` });
    if (flair.streak >= STREAK_BADGE_FROM) badges.push({ icon: `🔥${flair.streak}`, label: `${flair.streak}-day check-in streak` });
  }
  return (
    <>
      <span className={`${flair?.color ? NAME_COLOR_CLASS[flair.color] : ""} ${className}`} title={flair ? `Lenko Army ${flair.rank}` : undefined}>
        {name}
      </span>
      {flair?.squad && (
        <span className="ml-1.5 text-[11px] font-bold text-neutral-400" title={`Squad ${flair.squad}`}>
          [{flair.squad}]
        </span>
      )}
      {badges.map((b) => (
        <span key={b.label} className="ml-1.5 text-xs" title={b.label} aria-label={b.label}>
          {b.icon}
        </span>
      ))}
    </>
  );
}
