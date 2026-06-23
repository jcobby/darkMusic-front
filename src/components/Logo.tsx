"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Brand logo. Shows a clean text wordmark by default and swaps to
 * /public/logo.png the moment that file exists (preloaded on mount, so a
 * missing file never shows a broken image). Drop in `frontend/public/logo.png`.
 */
export function Logo({ className = "" }: { className?: string }) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setLogoSrc("/logo.png");
    img.src = "/logo.png";
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`}>
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt="Dark Music Yard"
          className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white font-display text-base font-bold leading-none text-ink">
            DM
          </span>
          <span className="leading-none">
            <span className="block font-display text-base font-bold tracking-tight text-white">
              DM YARD
            </span>
            <span className="block text-[9px] font-medium uppercase tracking-[0.32em] text-neutral-500 group-hover:text-accent">
              Dark Music Yard
            </span>
          </span>
        </>
      )}
    </Link>
  );
}
