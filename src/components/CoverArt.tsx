/**
 * Image with a branded gradient fallback when no cover is set, so cards always
 * look intentional even before real artwork is uploaded.
 */
export function CoverArt({
  src,
  alt,
  label,
  className = "",
}: {
  src?: string | null;
  alt: string;
  label?: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  const initials = (label || alt)
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-600 via-ink-700 to-accent-deep/40 ${className}`}
    >
      <span className="font-display text-3xl font-bold text-white/80">{initials}</span>
    </div>
  );
}
