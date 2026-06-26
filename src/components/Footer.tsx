import Link from "next/link";
import { site, navLinks } from "@/config/site";
import { Logo } from "./Logo";
import { StreamingLinks } from "./StreamingLinks";
import { PaymentBadges } from "./PaymentBadges";
import { VisitCounter } from "./VisitCounter";

export function Footer() {
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-white/[0.06] bg-ink-900">
      <div className="pointer-events-none absolute inset-x-0 -top-32 h-64 bg-[radial-gradient(50%_100%_at_50%_100%,rgba(45,212,191,0.1),transparent)]" />

      <div className="container-page relative grid gap-12 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-neutral-400">
            {site.tagline}
          </p>
          <div className="mt-6">
            <StreamingLinks links={site.streaming} />
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Explore
          </h4>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-neutral-400">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition hover:text-accent">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Get in touch
          </h4>
          <ul className="mt-5 space-y-2.5 text-sm text-neutral-400">
            <li>
              <a href={`mailto:${site.contact.email}`} className="transition hover:text-accent">
                {site.contact.email}
              </a>
            </li>
            {site.contact.whatsapp && (
              <li>
                <a
                  href={`https://wa.me/${site.contact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-accent"
                >
                  WhatsApp: +{site.contact.whatsapp}
                </a>
              </li>
            )}
          </ul>
          <h4 className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            We accept
          </h4>
          <PaymentBadges className="mt-3" />
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs text-neutral-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <VisitCounter />
          <p className="text-neutral-600">{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
