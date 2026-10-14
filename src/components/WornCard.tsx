import Link from "next/link";
import type { Merch } from "@/lib/api";
import { CoverArt } from "./CoverArt";
import { AuctionCountdown } from "./AuctionCountdown";

const ghs = (n: number) => `GH₵${n.toLocaleString("en-US")}`;

/** A Worn on Set piece: photo, "worn on set" tag, current bid and the clock. */
export function WornCard({ item }: { item: Merch }) {
  const a = item.auction;
  const live = a?.status === "live";
  return (
    <Link href={item.path} className={`card-hover group block h-full overflow-hidden ${live ? "" : "opacity-75"}`}>
      <div className="relative aspect-[4/5] overflow-hidden">
        <CoverArt
          src={item.images[0]}
          alt={`${item.name} — worn by Lenko Psycho on set`}
          label={item.name}
          width={700}
          className="transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {/* Shade only the bottom, behind the "Worn in" line — product shots are often on white */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/95 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-glow-sm">
            Worn on set
          </span>
          {!live && a && (
            <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              {a.status === "sold" ? "Sold" : a.status === "unsold" ? "Unsold" : "Ended"}
            </span>
          )}
        </div>
        {item.wornIn && (
          <p className="absolute bottom-2 left-3 right-3 truncate text-[11px] font-semibold text-neutral-200 sm:bottom-3 sm:left-4 sm:right-4 sm:text-xs">
            Worn in: {item.wornIn}
          </p>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-accent sm:text-base">{item.name}</h3>
        {a && (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                {a.highBidGhs != null ? (live ? "Current bid" : "Final bid") : "Starting bid"}
              </p>
              <p className="font-display text-lg font-bold text-white sm:text-xl">{ghs(a.highBidGhs ?? a.startingBidGhs)}</p>
              <p className="text-[11px] text-neutral-500">
                {a.bidCount} bid{a.bidCount === 1 ? "" : "s"}
              </p>
            </div>
            {live && (
              <div className="sm:text-right">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">Ends in</p>
                <AuctionCountdown endsAt={a.endsAt} className="font-display text-sm font-bold tabular-nums text-white" />
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
