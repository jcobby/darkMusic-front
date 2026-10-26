import type { Outcome } from "@/lib/pool/engine";

const ballList = (ids: number[]) => ids.filter((id) => id !== 0).join(", ");

/**
 * What a shot did, in words. `name(i)` is how to call each player ("You" for the
 * viewer), `you` is the viewer's seat (null for a watcher), `frames` the score after it.
 */
export function describeOutcome(o: Outcome, by: 0 | 1, name: (i: 0 | 1) => string, you: 0 | 1 | null, frames: [number, number]): string {
  const other: 0 | 1 = by === 0 ? 1 : 0;
  const has = (i: 0 | 1) => (you === i ? "have" : "has");
  const spot = o.respotted ? " (the 8 went back on its spot)" : "";
  if (o.frameWinner !== null) return `${o.frameReason} — frame to ${name(o.frameWinner)}! (${frames[0]}–${frames[1]})`;
  if (o.foul && o.rebreak) return `Foul: ${o.foul.toLowerCase()} — ${name(other)} ${you === other ? "break" : "breaks"} instead`;
  if (o.foul) return `Foul: ${o.foul.toLowerCase()} — ${name(other)} ${has(other)} ball in hand${o.kitchen ? " behind the line" : ""}${spot}`;
  if (o.keepsTurn) {
    const assigned = o.assigned ? ` — ${by === you ? "you're" : "they're"} ${o.assigned}` : "";
    return `${name(by)} potted ${ballList(o.potted)}${spot}${assigned} and ${by === you ? "go" : "goes"} again`;
  }
  const potted = o.potted.filter((id) => id !== 8);
  return potted.length
    ? `${name(by)} potted ${ballList(potted)} — but not one of ${by === you ? "yours" : "theirs"}`
    : `No pot — ${other === you ? "your" : `${name(other)}'s`} turn`;
}
