import { fanZone } from "@/config/site";

/** The free-to-participate line, under every fan activity (games, trivia, voting). */
export function FanZoneNote({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-neutral-300 ${className}`}>
      {fanZone.disclaimer}
    </p>
  );
}
