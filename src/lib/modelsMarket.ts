/**
 * DMY Models marketplace rules, mirrored from backend/src/config/modelsMarket.ts
 * (the backend enforces them — keep both in sync).
 */
export const MODELS_MARKET = {
  commissionRate: 0.15,
  minRateGhs: 2000,
  minAge: 18,
  minPhotos: 3,
  maxPhotos: 8,
};

export const MODEL_CATEGORIES = [
  "Music videos",
  "Photoshoots",
  "Commercials",
  "Events",
  "Brand promos",
  "Fashion / runway",
  "Hosting",
] as const;

export const MODEL_DECLARATIONS: { key: string; label: string }[] = [
  { key: "adult", label: "I am 18 years or older." },
  { key: "accurate", label: "The information I provided is accurate." },
  { key: "independent", label: "I am an independent model, not an employee of DMY." },
  { key: "responsible", label: "I am responsible for my own services." },
  {
    key: "commission",
    label: `I agree to DMY's ${MODELS_MARKET.commissionRate * 100}% commission on bookings made through the platform.`,
  },
  { key: "terms", label: "I agree to the DMY Models Terms." },
  { key: "display", label: "I authorize DMY to display my submitted photos and profile." },
];

export const ghs = (n: number | null | undefined) =>
  `GH₵${(n ?? 0).toLocaleString("en-US")}`;

export const instagramUrl = (handle: string) => `https://instagram.com/${handle}`;
export const tiktokUrl = (handle: string) => `https://www.tiktok.com/@${handle}`;

/** Friendly label + colour for each booking status. */
export const BOOKING_STATUS: Record<string, { label: string; className: string }> = {
  requested: { label: "Waiting for model", className: "bg-amber-500/15 text-amber-300" },
  accepted: { label: "Accepted · awaiting payment", className: "bg-accent/15 text-accent" },
  declined: { label: "Declined", className: "bg-white/5 text-neutral-400" },
  paid: { label: "Confirmed", className: "bg-accent text-white" },
  completed: { label: "Completed", className: "bg-white/10 text-neutral-200" },
  cancelled: { label: "Cancelled", className: "bg-white/5 text-neutral-400" },
  new: { label: "Old enquiry", className: "bg-accent/15 text-accent" },
  read: { label: "Old enquiry · read", className: "bg-white/10 text-neutral-300" },
  archived: { label: "Archived", className: "bg-white/5 text-neutral-500" },
};

/** "Sat 18 Oct 2026 · 14:00" from YYYY-MM-DD + HH:mm. */
export function formatWhen(date: string | null, time: string | null): string {
  if (!date) return "Date to be agreed";
  const d = new Date(`${date}T00:00:00`);
  const day = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return time ? `${day} · ${time}` : day;
}
