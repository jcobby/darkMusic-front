import type { Metadata } from "next";
import { getMerch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PHOTOS } from "@/config/media";
import { MerchCard } from "@/components/MerchCard";
import { PaymentBadges } from "@/components/PaymentBadges";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Merch",
  description: "Official DMY t-shirts, hoodies, caps, posters, signed and limited-edition merch.",
};

export default async function MerchPage() {
  const merch = await getMerch();
  // Live auctions get their own row at the top; everything else is the shop.
  const auctions = merch.filter((m) => m.auction?.status === "live");
  const shop = merch.filter((m) => m.auction?.status !== "live");

  return (
    <>
      <PageHeader
        eyebrow="Merchandise"
        title="Shop the Yard"
        subtitle="T-shirts, hoodies, caps, posters plus signed and limited-edition drops."
        image={PHOTOS.setDmyTeeBw}
      />
      {auctions.length > 0 && (
        <section className="container-page pt-12">
          <Reveal>
            <p className="eyebrow mb-2">
              <span className="h-px w-6 bg-accent" /> Live now
            </p>
            <h2 className="display-sm text-white">Bid on it</h2>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              One-off pieces sold by auction — the highest bid when the clock runs out wins. Sign in to bid.
            </p>
          </Reveal>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {auctions.map((m, i) => (
              <Reveal key={m.id} delay={(i % 4) * 0.07}>
                <MerchCard product={m} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
      <section className="container-page py-12">
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
        ) : auctions.length ? null : (
          <div className="card p-12 text-center text-neutral-500">
            New merch is on the way — check back soon.
          </div>
        )}
      </section>
    </>
  );
}
