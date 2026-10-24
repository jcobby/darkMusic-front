import type { GameEventInfo } from "./api";

const ghs = (n: number) => `GH₵${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
export const placeName = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

/** Event times are in Ghana time (GMT) — the same on the server and in every browser. */
export const eventTime = (iso: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Accra",
    ...opts,
  });

/** "GH₵100 · 1st GH₵60 · 2nd GH₵25 · 3rd GH₵15" — or bragging rights. */
export function prizeLine(ev: GameEventInfo) {
  if (ev.prizeGhs <= 0) return "Bragging rights + a ⚡ badge for the winner";
  if (ev.prizes.length <= 1) return `${ghs(ev.prizeGhs)} to the winner`;
  return `${ghs(ev.prizeGhs)} · ${ev.prizes.map((p, i) => `${placeName(i + 1)} ${ghs(p)}`).join(" · ")}`;
}
export const scoringLine = (ev: Pick<GameEventInfo, "metric">) =>
  ev.metric === "wins" ? "Most ranked Pool wins" : ev.metric === "days" ? "Your best game each day adds up" : "Your best single game counts";
export const gameName = (ev: Pick<GameEventInfo, "game">) => (ev.game === "pool" ? "DMY Pool" : "Beat Breaker");
export const gamePath = (ev: Pick<GameEventInfo, "game">) => (ev.game === "pool" ? "/games/pool" : "/games/beat-breaker");
export const kindLabel = (ev: Pick<GameEventInfo, "kind">) => (ev.kind === "live" ? "Live event" : "Weekly challenge");
export const eventGhs = ghs;
