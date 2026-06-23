import type { Metadata } from "next";
import { getMerch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { MerchCard } from "@/components/MerchCard";
import { PaymentBadges } from "@/components/PaymentBadges";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Merch",
  description: "Official DMY t-shirts, hoodies, caps, posters, signed and limited-edition merch.",
};

export default async function MerchPage() {
  const merch = await getMerch();

  return (
    <>
      <PageHeader
        eyebrow="Merchandise"
        title="Shop the Yard"
        subtitle="T-shirts, hoodies, caps, posters plus signed and limited-edition drops."
      />
      <section className="container-page py-12">
        {merch.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {merch.map((m, i) => (
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
            No products yet. Add them from the{" "}
            <a href="/admin" className="text-accent">
              admin dashboard
            </a>
            .
          </div>
        )}
      </section>
    </>
  );
}
