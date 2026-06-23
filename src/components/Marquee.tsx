import type { ReactNode } from "react";

/** Infinite horizontal marquee (pure CSS). Duplicates content for a seamless loop. */
export function Marquee({ children }: { children: ReactNode }) {
  return (
    <div className="mask-fade-x relative w-full overflow-hidden">
      <div className="flex w-max animate-marquee gap-12 pr-12">
        <div className="flex shrink-0 items-center gap-12">{children}</div>
        <div className="flex shrink-0 items-center gap-12" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
