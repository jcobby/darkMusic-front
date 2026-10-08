"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navLinks, primaryNavHrefs } from "@/config/site";
import { Logo } from "./Logo";
import { useCart } from "./CartProvider";
import { useFanAuth } from "./FanAuthProvider";

const primaryLinks = navLinks.filter((l) => primaryNavHrefs.includes(l.href));
const moreLinks = navLinks.filter((l) => l.href !== "/" && !primaryNavHrefs.includes(l.href));

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();
  const { user } = useFanAuth();
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close both menus when navigating to a new page.
  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  // Close the "More" dropdown on an outside click.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [moreOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const moreActive = moreLinks.some((l) => isActive(l.href));

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass border-b border-white/[0.06]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="container-page flex h-[4.5rem] items-center justify-between gap-4">
        <Logo />

        <div className="hidden items-center gap-0.5 lg:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium transition-colors xl:px-3.5 ${
                isActive(link.href) ? "text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              {link.label}
              <span
                className={`absolute inset-x-2 -bottom-0.5 h-px origin-left xl:inset-x-3.5 bg-gradient-to-r from-accent to-accent-soft transition-transform duration-300 ${
                  isActive(link.href)
                    ? "scale-x-100"
                    : "scale-x-0 group-hover:scale-x-100"
                }`}
              />
            </Link>
          ))}

          {/* Secondary links collapse into a "More" dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm font-medium transition-colors xl:px-3.5 ${
                moreActive || moreOpen ? "text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              More
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {moreOpen && (
              <div className="glass absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 p-1.5 shadow-card">
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive(link.href)
                        ? "bg-white/5 text-accent"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/account"
            aria-label="Account"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:border-accent/50 hover:text-white"
          >
            {user ? (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
            )}
            {/* Icon-only between lg and xl, where the inline menu needs the room */}
            <span className="hidden sm:inline lg:hidden xl:inline">{user ? user.name || "Account" : "Sign in"}</span>
          </Link>
          <Link
            href="/cart"
            className="group relative inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-accent/50 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 4h2l2.4 12.5a2 2 0 0 0 2 1.5h7.7a2 2 0 0 0 2-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
            </svg>
            <span className="hidden sm:inline lg:hidden xl:inline">Cart</span>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white shadow-glow-sm">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="btn-ghost px-2 lg:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="glass border-t border-white/[0.06] lg:hidden">
          <div className="container-page flex flex-col py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3 py-3 text-base font-medium transition ${
                  isActive(link.href)
                    ? "bg-white/5 text-accent"
                    : "text-neutral-200 hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
