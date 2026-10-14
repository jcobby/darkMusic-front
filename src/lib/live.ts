/** Show times are always given in Ghana time (GMT), the same on the server and in the browser. */
export const showTime = (iso: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Accra",
    ...opts,
  });

/** "Add to Google Calendar" link for a show. */
export function calendarLink(title: string, startsAt: string, durationMins: number, url: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMins * 60000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${title} — Lenko Psycho live`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Watch on Dark Music Yard: ${url}`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
