import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { getMerch, getMerchItem } from "@/lib/api";
import { SectionHeading } from "@/components/SectionHeading";
import { MerchCard } from "@/components/MerchCard";
import { CoverArt } from "@/components/CoverArt";
import { MerchPurchase } from "@/components/MerchPurchase";
import { MerchAuction } from "@/components/MerchAuction";
import { PaymentBadges } from "@/components/PaymentBadges";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/config/site";

// Each product page is built on its first visit, then served from cache and refreshed every minute.
export const revalidate = 60;
export const generateStaticParams = () => [];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getMerchItem(slug);
  if (!product) return { title: "Merch" };
  const price = product.auction
    ? `Live auction — bids from GH₵${product.auction.highBidGhs ?? product.auction.startingBidGhs}`
    : `GH₵${product.priceGhs}`;
  const description = `${product.name} — official Dark Music Yard merch. ${price}. ${
    product.description ?? "Pay with Mobile Money or card."
  }`.slice(0, 300);
  return {
    title: `${product.name} — DMY Merch`,
    description,
    alternates: { canonical: `/merch/${product.slug}` },
    openGraph: { title: product.name, description, images: product.images[0] ? [product.images[0]] : undefined },
  };
}

export default async function MerchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, all] = await Promise.all([getMerchItem(slug), getMerch()]);
  if (!product) notFound();
  // Worn-on-set pieces live in their own section.
  if (product.kind === "worn") permanentRedirect(`/worn-on-set/${product.slug}`);
  const more = all.filter((m) => m.slug !== product.slug).slice(0, 4);

  return (
    <>
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description ?? undefined,
        image: product.images,
        brand: { "@type": "Brand", name: "Dark Music Yard" },
        url: `${site.url}/merch/${product.slug}`,
        offers: {
          "@type": "Offer",
          price: product.auction ? product.auction.highBidGhs ?? product.auction.startingBidGhs : product.priceGhs,
          priceCurrency: "GHS",
          availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          url: `${site.url}/merch/${product.slug}`,
        },
      }}
    />
    <section className="container-page py-8 sm:py-12">
      <Link href="/merch" className="btn-ghost mb-4 min-h-[44px] px-0 text-sm sm:mb-6">
        ← Back to merch
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="card aspect-square overflow-hidden">
            <CoverArt src={product.images[0]} alt={`${product.name} — official Dark Music Yard merch`} label={product.name} width={1200} />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(1, 5).map((img, i) => (
                <div key={i} className="card aspect-square overflow-hidden">
                  <CoverArt src={img} alt={`${product.name} ${i + 2}`} width={320} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {product.auction && (
              <span className="rounded-full border border-accent/60 bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-white">
                🔨 Auction
              </span>
            )}
            {product.isLimited && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-white">
                Limited edition
              </span>
            )}
            {product.isSigned && (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-ink">
                Signed
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">{product.name}</h1>
          <p className="mt-1 text-sm capitalize text-neutral-500">{product.category}</p>
          {!product.auction && <p className="mt-4 text-2xl font-bold text-accent">GH₵{product.priceGhs}</p>}
          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-neutral-300">
              {product.description}
            </p>
          )}

          <div className="mt-7">
            {product.auction ? <MerchAuction product={product} /> : <MerchPurchase product={product} />}
          </div>

          <div className="mt-8 border-t border-ink-600 pt-5">
            <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
              Payment methods
            </p>
            <PaymentBadges />
          </div>
        </div>
      </div>
    </section>

    {more.length > 0 && (
      <section className="container-page pb-16">
        <SectionHeading eyebrow="Keep shopping" title="More merch" href="/merch" linkLabel="Shop all merch" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {more.map((m) => (
            <MerchCard key={m.id} product={m} />
          ))}
        </div>
      </section>
    )}
    </>
  );
}
