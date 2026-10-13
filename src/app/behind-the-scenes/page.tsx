import type { Metadata } from "next";
import Link from "next/link";
import { getGallery } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { BtsGallery, type BtsPhoto } from "@/components/BtsGallery";
import { Reveal } from "@/components/Reveal";
import { PHOTOS, VIDEOS, type SitePhoto } from "@/config/media";
import { latestRelease } from "@/config/site";

export const metadata: Metadata = {
  title: "Behind the Scenes",
  description: "Behind-the-scenes photos from Dark Music Yard video shoots and sessions with Lenko Psycho.",
};

// New uploads from the admin show up within five minutes.
export const revalidate = 300;

const fromSite = (p: SitePhoto): BtsPhoto => ({ src: p.src, alt: p.alt, caption: p.alt, position: p.position });

// The shoots already on the site, kept as their own sets below the new uploads.
const SHOOTS: { title: string; blurb: string; photos: SitePhoto[] }[] = [
  {
    title: "The red-couch video shoot",
    blurb: "Cast, crew and cameras on set for a DMY music video.",
    photos: [
      PHOTOS.couchCrewColor,
      PHOTOS.setCameraCrew,
      PHOTOS.couchVestBw,
      PHOTOS.setMonitorBw,
      PHOTOS.couchDuoColor,
      PHOTOS.setDmyTeeBw,
      PHOTOS.couchCrewBw,
      PHOTOS.couchDuoBw,
    ],
  },
  {
    title: "The car-park shoot",
    blurb: "Lenko Psycho and a black Mercedes, between takes.",
    photos: [
      PHOTOS.carRedSeats,
      PHOTOS.mercedesBw,
      PHOTOS.carparkWalk,
      PHOTOS.carSmileBw,
      PHOTOS.carparkPoseBw,
      PHOTOS.handsUpBw,
      PHOTOS.lounge,
    ],
  },
];

export default async function BehindTheScenesPage() {
  const uploads = await getGallery();

  // Group uploads by shoot, keeping the order they came in (sort order, newest first).
  const groups = new Map<string, BtsPhoto[]>();
  for (const p of uploads) {
    const key = p.shoot || "Latest from the Yard";
    const list = groups.get(key) ?? [];
    list.push({ src: p.src, alt: p.caption || `Behind the scenes — ${key}`, caption: p.caption });
    groups.set(key, list);
  }

  const sets = [
    ...Array.from(groups, ([title, photos]) => ({ title, blurb: null as string | null, photos })),
    ...SHOOTS.map((s) => ({ title: s.title, blurb: s.blurb, photos: s.photos.map(fromSite) })),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Behind the Scenes"
        title="Inside the Yard"
        subtitle="Video shoots, studio days and everything between — the moments behind Lenko Psycho's records. Tap any photo to see it full-size."
        image={{ src: VIDEOS.lenkoOnSet.poster, alt: VIDEOS.lenkoOnSet.alt, video: VIDEOS.lenkoOnSet.src }}
      />

      {sets.map((set, i) => (
        <section key={set.title} className={`container-page ${i === 0 ? "pt-12" : "pt-14"}`}>
          <Reveal>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="eyebrow mb-2">
                  <span className="h-px w-6 bg-accent" />
                  {set.photos.length} photo{set.photos.length === 1 ? "" : "s"}
                </p>
                <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">{set.title}</h2>
                {set.blurb && <p className="mt-1 text-sm text-neutral-400">{set.blurb}</p>}
              </div>
            </div>
          </Reveal>
          <BtsGallery photos={set.photos} />
        </section>
      ))}

      <section className="container-page py-16">
        <Reveal>
          <div className="card relative overflow-hidden p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,31,61,0.18),transparent)]" />
            <p className="relative eyebrow justify-center">Out now</p>
            <h2 className="relative mt-2 font-display text-3xl font-bold text-white">
              {latestRelease.title} <span className="text-neutral-400">ft. {latestRelease.featuring}</span>
            </h2>
            <p className="relative mt-2 text-sm text-neutral-400">Hear what all this work sounds like.</p>
            <div className="relative mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/#latest" className="btn-accent">
                Listen now
              </Link>
              <Link href="/community" className="btn-outline">
                Join the Lenko Army
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
