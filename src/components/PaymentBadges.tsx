const METHODS = [
  { label: "MTN MoMo", color: "#FFCC00" },
  { label: "Telecel Cash", color: "#E2001A" },
  { label: "Visa", color: "#1A1F71" },
  { label: "Mastercard", color: "#EB001B" },
];

/** Trust badges for accepted payment methods. */
export function PaymentBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {METHODS.map((m) => (
        <span
          key={m.label}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-neutral-300"
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
          {m.label}
        </span>
      ))}
    </div>
  );
}
