import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel = "View all",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="eyebrow mb-3">
            <span className="h-px w-6 bg-accent" />
            {eyebrow}
          </p>
        )}
        <h2 className="display-sm text-white text-balance">{title}</h2>
        {subtitle && (
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-neutral-300 transition hover:text-accent"
        >
          {linkLabel}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );
}
