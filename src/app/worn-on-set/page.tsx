import type { Metadata } from "next";
import Link from "next/link";
import { getWornItems } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { WornCard } from "@/components/WornCard";
import { Reveal } from "@/components/Reveal";
import { SocialLinks } from "@/components/SocialLinks";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Worn on Set — Bid on Clothes Lenko Psycho Wore in His Videos",
  description:
    "The Yard Auction: bid on one-of-one clothes and pieces Lenko Psycho wore during Dark Music Yard video shoots. Used, authentic, straight from the set. Pay with Mobile Money or card.",
  alternates: { canonical: "/worn-on-set" },
};

// Bids move fast — refresh the list often.
export const revalidate = 30;

const STEPS = [
  { n: "1", title: "Bid", body: "Sign in and bid. The first bid starts a 14-day countdown. Outbid? We'll tell you." },
  { n: "2", title: "Win", body: "Highest bid when the 14 days run out takes it." },
  { n: "3", title: "Pay", body: "Pay your bid within the window — Mobile Money or card." },
  { n: "4", title: "Wear it", body: "We contact you to arrange delivery of your piece." },
];

export default async function WornOnSetPage() {
  const items = await getWornItems();
  const live = items.filter((i) => i.auction?.status === "live");
  const past = items.filter((i) => i.auction?.status !== "live").slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="The Yard Auction"
        title="Worn on Set"
        subtitle="Clothes and pieces Lenko Psycho actually wore in the videos — used, one of one, straight from the shoot. Bid, win, own a piece of the story."
        image={PHOTOS.couchVestBw}
      />

      {/* How it works */}
      <section className="container-page pt-8 sm:pt-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-white">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-xs text-white">{s.n}</span>
                {s.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-10 sm:py-14">
        {live.length > 0 ? (
          <>
            <Reveal>
              <p className="eyebrow mb-2">
                <span className="h-px w-6 bg-accent" /> Live now
              </p>
              <h2 className="display-sm text-white">Bid before the clock runs out</h2>
            </Reveal>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {live.map((item, i) => (
                <Reveal key={item.id} delay={(i % 3) * 0.06}>
                  <WornCard item={item} />
                </Reveal>
              ))}
            </div>
          </>
        ) : (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <p className="text-3xl" aria-hidden>
              🧥
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-white">The next drop is being prepared</p>
            <p className="mt-2 text-sm text-neutral-400">
              New worn-on-set pieces land here first. Follow Lenko so you hear the moment bidding opens.
            </p>
            <SocialLinks labels className="mt-5 justify-center" />
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="container-page pb-12">
          <h2 className="mb-5 font-display text-2xl font-bold text-white">Recently ended</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {past.map((item) => (
              <WornCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page pb-16">
        <Link
          href="/merch"
          className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-accent/50"
        >
          <span>
            <span className="block font-semibold text-white">Want something new instead?</span>
            <span className="text-sm text-neutral-400">Official DMY tees, hoodies, caps and posters — fixed prices in the shop.</span>
          </span>
          <span className="text-sm font-semibold text-accent">Shop DMY merch →</span>
        </Link>
      </section>
    </>
  );
}
