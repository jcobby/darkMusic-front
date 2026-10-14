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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-5 gap-y-3 sm:mb-10">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="eyebrow mb-3">
            <span className="h-px w-6 bg-accent" />
            {eyebrow}
          </p>
        )}
        <h2 className="display-sm text-white text-balance">{title}</h2>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-neutral-400 sm:mt-3 sm:text-[15px]">{subtitle}</p>
        )}
      </div>
      {href &&
        (/^https?:\/\//.test(href) ? (
          // Off-site (YouTube, Spotify…) — new tab, marked with ↗
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-neutral-300 transition hover:text-accent"
          >
            {linkLabel}
            <span className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span>
          </a>
        ) : (
          <Link
            href={href}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-neutral-300 transition hover:text-accent"
          >
            {linkLabel}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        ))}
    </div>
  );
}
