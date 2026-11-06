// Plain helpers for Lenko Army Music Trivia (the monthly music trivia), safe for server pages.

/** The activity's name. */
export const EXAM_NAME = "Lenko Army Music Trivia";

const day = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const time = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

/** "Saturday 31 Oct, 12:00–12:10 GMT" (Ghana time is GMT). */
export function sessionWhen(startsAt: string, endsAt: string): string {
  const a = new Date(startsAt);
  return `${day(a)}, ${time(a)}–${time(new Date(endsAt))} GMT`;
}

/** How long the session stays open, in minutes. */
export const sessionMinutes = (startsAt: string, endsAt: string) => Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60000);

/** The usual date of the exam after this one: the last day of the next month at 12:00 GMT — "Monday 30 Nov, 12:00 GMT". */
export function nextExamAfter(startsAt: string): string {
  const a = new Date(startsAt);
  return `${day(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 2, 0, 12)))}, 12:00 GMT`;
}
