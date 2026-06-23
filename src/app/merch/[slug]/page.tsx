import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMerchItem } from "@/lib/api";
import { CoverArt } from "@/components/CoverArt";
import { MerchPurchase } from "@/components/MerchPurchase";
import { PaymentBadges } from "@/components/PaymentBadges";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getMerchItem(slug);
  return { title: product ? product.name : "Merch" };
}

export default async function MerchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getMerchItem(slug);
  if (!product) notFound();

  return (
    <section className="container-page py-12">
      <Link href="/merch" className="btn-ghost mb-6 px-0 text-sm">
        ← Back to merch
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="card aspect-square overflow-hidden">
            <CoverArt src={product.images[0]} alt={product.name} label={product.name} />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(1, 5).map((img, i) => (
                <div key={i} className="card aspect-square overflow-hidden">
                  <CoverArt src={img} alt={`${product.name} ${i + 2}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex gap-2">
            {product.isLimited && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-ink">
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
          <p className="mt-4 text-2xl font-bold text-accent">GH₵{product.priceGhs}</p>
          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-neutral-300">
              {product.description}
            </p>
          )}

          <div className="mt-7">
            <MerchPurchase product={product} />
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
  );
}
