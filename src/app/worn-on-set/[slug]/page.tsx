import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { getMerchItem, getWornItems } from "@/lib/api";
import { ProductGallery } from "@/components/ProductGallery";
import { MerchAuction } from "@/components/MerchAuction";
import { WornCard } from "@/components/WornCard";
import { PaymentBadges } from "@/components/PaymentBadges";
import { ShareButton } from "@/components/TrackActions";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/config/site";

export const revalidate = 30;
export const generateStaticParams = () => [];

const ghs = (n: number) => `GH₵${n.toLocaleString("en-US")}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getMerchItem(slug);
  if (!item || item.kind !== "worn") return { title: "Worn on Set" };
  const bid = item.auction ? ghs(item.auction.highBidGhs ?? item.auction.startingBidGhs) : "";
  const description = `${item.name} — worn by Lenko Psycho${item.wornIn ? ` in ${item.wornIn}` : " on set"}. Used, one of one. Bid now from ${bid} on Dark Music Yard.`;
  return {
    title: `${item.name} — Worn on Set auction`,
    description,
    alternates: { canonical: `/worn-on-set/${item.slug}` },
    openGraph: { title: `${item.name} — worn by Lenko Psycho`, description, images: item.images[0] ? [item.images[0]] : undefined },
  };
}

export default async function WornItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [item, all] = await Promise.all([getMerchItem(slug), getWornItems()]);
  if (!item) notFound();
  if (item.kind !== "worn") permanentRedirect(`/merch/${item.slug}`);
  const more = all.filter((m) => m.slug !== item.slug && m.auction?.status === "live").slice(0, 3);
  const url = `${site.url}/worn-on-set/${item.slug}`;

  return (
    <>
      {item.auction && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: item.name,
            description: item.description ?? undefined,
            image: item.images,
            itemCondition: "https://schema.org/UsedCondition",
            brand: { "@type": "Brand", name: "Dark Music Yard" },
            url,
            offers: {
              "@type": "Offer",
              price: item.auction.highBidGhs ?? item.auction.startingBidGhs,
              priceCurrency: "GHS",
              availability: item.auction.status === "live" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
              url,
            },
          }}
        />
      )}
      <section className="container-page py-8 sm:py-12">
        <Link href="/worn-on-set" className="btn-ghost mb-4 min-h-[44px] px-0 text-sm">
          ← All Worn on Set pieces
        </Link>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <ProductGallery images={item.images} alt={`${item.name}, worn by Lenko Psycho`} aspect="aspect-[4/5]" />

          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-glow-sm">
                Used — worn during video shoot
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-200">
                1 of 1
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold text-white text-balance sm:text-4xl">{item.name}</h1>
            {item.wornIn && (
              <p className="mt-2 text-neutral-300">
                Worn by Lenko Psycho in <span className="font-semibold text-white">{item.wornIn}</span>
              </p>
            )}
            {item.description && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-300">{item.description}</p>
            )}
            <dl className="mt-5 grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-neutral-500">Condition</dt>
                <dd className="mt-0.5 text-white">{item.condition || "Used — worn on set"}</dd>
              </div>
              {item.sizes.length > 0 && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-neutral-500">Size</dt>
                  <dd className="mt-0.5 text-white">{item.sizes.join(" / ")}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6">
              <MerchAuction product={item} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ShareButton title={`${item.name} — worn by Lenko Psycho`} url={url} label="Share this piece" />
            </div>
            <div className="mt-6 border-t border-white/[0.06] pt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Winners pay with</p>
              <PaymentBadges />
            </div>
          </div>
        </div>
      </section>

      {more.length > 0 && (
        <section className="container-page pb-16">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-white">More pieces up for auction</h2>
            <Link href="/worn-on-set" className="text-sm font-semibold text-accent hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((m) => (
              <WornCard key={m.id} item={m} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
