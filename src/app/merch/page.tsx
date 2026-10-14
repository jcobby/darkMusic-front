import type { Metadata } from "next";
import Link from "next/link";
import { getMerch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PHOTOS } from "@/config/media";
import { MerchCard } from "@/components/MerchCard";
import { PaymentBadges } from "@/components/PaymentBadges";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Merch — Official DMY T-Shirts, Hoodies & Signed Drops",
  description:
    "Official Dark Music Yard and Lenko Psycho merch: t-shirts, hoodies, caps, posters, signed and limited pieces. Pay with Mobile Money or card. For clothes Lenko wore in the videos, see the Worn on Set auction.",
  alternates: { canonical: "/merch" },
};

export default async function MerchPage() {
  const merch = await getMerch();
  const shop = merch;

  return (
    <>
      <PageHeader
        eyebrow="Merchandise"
        title="Shop the Yard"
        subtitle="T-shirts, hoodies, caps, posters plus signed and limited-edition drops."
        image={PHOTOS.setDmyTeeBw}
      />
      {/* The auction of pieces worn on set lives in its own section */}
      <section className="container-page pt-8 sm:pt-12">
        <Link
          href="/worn-on-set"
          className="group flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-accent/40 bg-gradient-to-r from-accent-deep/50 via-ink-700/80 to-ink-700/80 p-5 transition hover:border-accent sm:p-6"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">The Yard Auction</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">🧥 Worn on Set</p>
            <p className="mt-1 text-sm text-neutral-300">Bid on the actual clothes Lenko Psycho wore in the videos — one of one.</p>
          </div>
          <span className="btn-accent min-h-[48px]">See the auction →</span>
        </Link>
      </section>      <section className="container-page py-12">
        {shop.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shop.map((m, i) => (
                <Reveal key={m.id} delay={(i % 4) * 0.07}>
                  <MerchCard product={m} />
                </Reveal>
              ))}
            </div>
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Secure checkout — we accept
              </p>
              <PaymentBadges className="justify-center" />
            </div>
          </>
        ) : (
          <div className="card p-12 text-center text-neutral-500">
            New merch is on the way — check back soon.
          </div>
        )}
      </section>
    </>
  );
}
