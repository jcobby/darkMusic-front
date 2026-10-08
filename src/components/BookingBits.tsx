import { BOOKING_STATUS, formatWhen } from "@/lib/modelsMarket";

/** Shared pieces for the customer + model booking cards. */

export function BookingStatusPill({ status }: { status: string }) {
  const s = BOOKING_STATUS[status] ?? { label: status, className: "bg-white/10 text-neutral-300" };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.className}`}>
      {s.label}
    </span>
  );
}

export function BookingFacts({
  b,
}: {
  b: {
    date: string | null;
    time: string | null;
    location: string | null;
    shootType: string | null;
    durationHours: number | null;
    modelsCount: number;
    requirements: string | null;
  };
}) {
  const bits = [
    b.shootType,
    b.durationHours ? `${b.durationHours} hr${b.durationHours === 1 ? "" : "s"}` : null,
    b.modelsCount > 1 ? `${b.modelsCount} models in total` : null,
  ].filter(Boolean);
  return (
    <div className="mt-2 space-y-0.5 text-sm text-neutral-300">
      <p>
        📅 {formatWhen(b.date, b.time)}
        {b.location ? <span className="text-neutral-400"> · 📍 {b.location}</span> : null}
      </p>
      {bits.length > 0 && <p className="text-neutral-400">{bits.join(" · ")}</p>}
      {b.requirements && <p className="text-neutral-400">“{b.requirements}”</p>}
    </div>
  );
}

/** wa.me link from a Ghana-style number (0XX… → 233XX…). */
export function whatsappLink(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

export function ContactBlock({
  title,
  name,
  phone,
  email,
}: {
  title: string;
  name?: string;
  phone: string | null;
  email: string | null;
}) {
  return (
    <div className="mt-3 rounded-xl border border-accent/30 bg-accent/[0.08] p-3 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-soft">{title}</p>
      {name && <p className="mt-1 font-semibold text-white">{name}</p>}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {phone && (
          <>
            <a href={`tel:${phone}`} className="text-neutral-100 hover:text-accent">
              📞 {phone}
            </a>
            <a href={whatsappLink(phone)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              WhatsApp
            </a>
          </>
        )}
        {email && (
          <a href={`mailto:${email}`} className="break-all text-neutral-100 hover:text-accent">
            ✉️ {email}
          </a>
        )}
      </div>
    </div>
  );
}
