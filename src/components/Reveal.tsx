import type { ReactNode } from "react";

/*
 * Scroll fade-ins in plain CSS (see .dmy-reveal in globals.css) — no animation library and no
 * script, so phones have less to download before buttons work. A fade only: content never moves,
 * so taps land where they're aimed. Browsers without scroll-driven animations just show it.
 */

/** Fades content in as it scrolls into view. (`delay` is kept for callers; the fade follows the scroll.) */
export function Reveal({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const Tag = as;
  return <Tag className={`dmy-reveal ${className ?? ""}`}>{children}</Tag>;
}

/** Wrap a group; children using <RevealItem> fade in as they scroll into view. */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/** A child of RevealGroup that fades in. */
export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`dmy-reveal ${className ?? ""}`}>{children}</div>;
}
