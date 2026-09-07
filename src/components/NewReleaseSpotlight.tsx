import Link from "next/link";
import { CoverArt } from "./CoverArt";
import { StreamingLinks } from "./StreamingLinks";
import { Reveal } from "./Reveal";
import type { Release } from "@/lib/api";

/** Big "out now" spotlight for the newest release, with an optional
 *  behind-the-scenes photo gallery. Rendered high on the home page. */
export function NewReleaseSpotlight({
  release,
  gallery = [],
  blurb,
}: {
  release: Release;
  gallery?: string[];
  blurb?: string;
}) {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(45,212,191,0.13),transparent)]" />
      <div className="container-page relative">
        <Reveal>
          <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            {/* Cover */}
            <div className="mx-auto w-full max-w-sm">
              <div className="card relative aspect-square overflow-hidden shadow-glow">
                <CoverArt src={release.coverImage} alt={release.title} label={release.title} />
                <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-ink shadow-glow-sm">
                  NEW RELEASE
                </span>
              </div>
            </div>

            {/* Info */}
            <div>
              <p className="eyebrow mb-3">
                <span className="h-px w-6 bg-accent" /> Out Now
              </p>
              <h2 className="display-sm text-white text-balance">{release.title}</h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-400">
                {blurb ??
                  "The newest drop from Lenko Psycho — out now on every platform. Stream it, share it, and watch the visuals."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href={`/music/${release.slug}`} className="btn-accent">
                  Listen now
                </Link>
              </div>

              <div className="mt-6">
                <p className="label">Stream on</p>
                <StreamingLinks
                  links={{
                    spotify: release.spotifyUrl,
                    apple: release.appleUrl,
                    youtube: release.youtubeUrl,
                  }}
                  size="md"
                />
              </div>
            </div>
          </div>
        </Reveal>

        {gallery.length > 0 && (
          <Reveal delay={0.1}>
            <div className="mt-12">
              <p className="eyebrow mb-4">
                <span className="h-px w-6 bg-accent" /> Behind the making of it
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {gallery.map((src, i) => (
                  <div key={i} className="card-hover aspect-[3/4] overflow-hidden">
                    <CoverArt src={src} alt={`${release.title} — behind the scenes ${i + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
