import Link from "next/link";
import type { Merch } from "@/lib/api";
import { CoverArt } from "./CoverArt";

export function MerchCard({ product }: { product: Merch }) {
  return (
    <Link href={`/merch/${product.slug}`} className="card-hover group block overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden">
        <CoverArt
          src={product.images[0]}
          alt={product.name}
          label={product.name}
          className="transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-700/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {product.isLimited && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-ink shadow-glow-sm">
              Limited
            </span>
          )}
          {product.isSigned && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-ink">
              Signed
            </span>
          )}
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 grid place-items-center bg-ink/70 backdrop-blur-sm">
            <span className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
              Sold out
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white transition-colors group-hover:text-accent">
            {product.name}
          </h3>
          <p className="text-xs capitalize text-neutral-500">{product.category}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/[0.04] px-3 py-1 text-sm font-bold text-accent">
          GH₵{product.priceGhs}
        </span>
      </div>
    </Link>
  );
}
