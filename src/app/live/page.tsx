import type { Metadata } from "next";
import Link from "next/link";
import { getLiveShows, type LiveShow } from "@/lib/api";
import { showTime } from "@/lib/live";
import { PageHeader } from "@/components/PageHeader";
import { CoverArt } from "@/components/CoverArt";
import { Reveal } from "@/components/Reveal";
import { SocialLinks } from "@/components/SocialLinks";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Live Shows — Watch Lenko Psycho Live",
  description:
    "Buy a ticket to watch Lenko Psycho perform live on Dark Music Yard — pay once with Mobile Money or card, watch the stream and the replay.",
  alternates: { canonical: "/live" },
};

export const revalidate = 60;

const STATUS: Record<LiveShow["status"], { label: string; className: string }> = {
  live: { label: "● Live now", className: "bg-accent text-white shadow-glow-sm" },
  upcoming: { label: "Upcoming", className: "bg-white text-ink" },
  ended: { label: "Replay", className: "bg-ink/80 text-white" },
};

export default async function LivePage() {
  const shows = (await getLiveShows()).filter((s) => s.status !== "ended" || s.replay);

  return (
    <>
      <PageHeader
        eyebrow="Pay-per-view"
        title="Live Shows"
        subtitle="Watch Lenko Psycho perform live, from anywhere. One ticket gets you the live stream and the replay — pay with Mobile Money or card."
        image={PHOTOS.handsUpBw}
      />
      <section className="container-page py-10 sm:py-14">
        {shows.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shows.map((s, i) => (
              <Reveal key={s.id} delay={(i % 3) * 0.08}>
                <Link href={`/live/${s.slug}`} className="card-hover group block h-full overflow-hidden">
                  <div className="relative aspect-video overflow-hidden">
                    <CoverArt
                      src={s.poster ?? PHOTOS.handsUpBw.src}
                      alt={`${s.title} — Lenko Psycho live show poster`}
                      label={s.title}
                      width={800}
                    />
                    <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS[s.status].className}`}>
                      {STATUS[s.status].label}
                    </span>
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-xl font-bold text-white">{s.title}</h2>
                    <p className="mt-1 text-sm text-neutral-400">{showTime(s.startsAt)} · Ghana time</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-accent">GH₵{s.priceGhs}</span>
                      <span className="text-sm font-semibold text-white">
                        {s.status === "ended" ? "Watch the replay →" : "Get your ticket →"}
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <p className="font-display text-2xl font-bold text-white">No shows scheduled yet</p>
            <p className="mt-2 text-sm text-neutral-400">
              The next live performance will be announced here first. Follow Lenko so you don&apos;t miss it.
            </p>
            <SocialLinks labels className="mt-5 justify-center" />
          </div>
        )}
      </section>
    </>
  );
}
