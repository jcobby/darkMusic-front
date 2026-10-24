import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getGameEvent } from "@/lib/api";
import { EventBoardView } from "@/components/games/EventBoardView";
import { eventTime, gameName, prizeLine, scoringLine } from "@/lib/events";

export const revalidate = 30;
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getGameEvent(slug, null, { revalidate: 30, limit: 1 });
  if (!data) return { title: "Game event" };
  const ev = data.event;
  const description = `${ev.kind === "live" ? `Live ${gameName(ev)} event` : `${gameName(ev)} weekly challenge`} on Dark Music Yard — ${eventTime(ev.startsAt)} to ${eventTime(ev.endsAt)} (Ghana time). ${prizeLine(ev)}. ${scoringLine(ev)}.`;
  return {
    title: `${ev.title} — ${gameName(ev)}`,
    description,
    alternates: { canonical: `/games/events/${ev.slug}` },
    openGraph: { title: `⚡ ${ev.title} — ${gameName(ev)} on DMY`, description },
  };
}

export default async function GameEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getGameEvent(slug, null, { revalidate: 30, limit: 50 });
  if (!data) notFound();
  return (
    <section className="container-page py-8 sm:py-12">
      <Link href="/games/leaderboard" className="btn-ghost mb-4 min-h-[44px] px-0 text-sm">
        ← Leaderboards
      </Link>
      <EventBoardView initial={data} />
    </section>
  );
}
