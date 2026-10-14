import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLiveShow } from "@/lib/api";
import { showTime } from "@/lib/live";
import { CoverArt } from "@/components/CoverArt";
import { LiveTicketPanel } from "@/components/LiveTicketPanel";
import { PaymentBadges } from "@/components/PaymentBadges";
import { PHOTOS } from "@/config/media";
import { site } from "@/config/site";
import { JsonLd, ARTIST_ID, ORG_ID } from "@/components/JsonLd";

export const revalidate = 60;
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const show = await getLiveShow(slug);
  if (!show) return { title: "Live show" };
  const description = `Watch ${show.title} — Lenko Psycho live on ${showTime(show.startsAt)} (Ghana time). Ticket GH₵${show.priceGhs}, includes the replay.`;
  return {
    title: `${show.title} — Live`,
    description,
    alternates: { canonical: `/live/${show.slug}` },
    openGraph: { title: `${show.title} — Lenko Psycho live`, description, images: show.poster ? [show.poster] : undefined },
  };
}

export default async function LiveShowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const show = await getLiveShow(slug);
  if (!show) notFound();

  const url = `${site.url}/live/${show.slug}`;
  return (
    <section className="container-page py-8 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: show.title,
          description: show.description ?? undefined,
          image: show.poster ?? undefined,
          startDate: show.startsAt,
          endDate: new Date(new Date(show.startsAt).getTime() + show.durationMins * 60000).toISOString(),
          eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
          eventStatus: "https://schema.org/EventScheduled",
          location: { "@type": "VirtualLocation", url },
          performer: { "@type": "MusicGroup", "@id": ARTIST_ID, name: "Lenko Psycho" },
          organizer: { "@id": ORG_ID },
          offers: {
            "@type": "Offer",
            price: show.priceGhs,
            priceCurrency: "GHS",
            availability: show.onSale ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            url,
          },
        }}
      />
      <Link href="/live" className="btn-ghost mb-4 min-h-[44px] px-0 text-sm">
        ← All live shows
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="card relative aspect-video overflow-hidden">
            <CoverArt
              src={show.poster ?? PHOTOS.handsUpBw.src}
              alt={`${show.title} — Lenko Psycho live show poster`}
              label={show.title}
              width={1200}
            />
          </div>
          {show.description && (
            <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-neutral-300">{show.description}</p>
          )}
        </div>
        <div>
          <p className="eyebrow mb-2">
            <span className="h-px w-6 bg-accent" /> Pay-per-view
          </p>
          <h1 className="display-sm text-white text-balance">{show.title}</h1>
          <p className="mt-2 text-neutral-300">
            {showTime(show.startsAt, { weekday: "long", month: "long" })} · Ghana time
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            About {show.durationMins >= 60 ? `${Math.round((show.durationMins / 60) * 10) / 10} hr` : `${show.durationMins} min`}
            {show.replay ? " · replay included" : ""}
          </p>
          <div className="mt-6">
            <LiveTicketPanel initial={show} />
          </div>
          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Pay with</p>
            <PaymentBadges />
          </div>
        </div>
      </div>
    </section>
  );
}
