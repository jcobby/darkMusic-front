import Link from "next/link";
import { getReleases, getMerch } from "@/lib/api";
import { Hero } from "@/components/Hero";
import { SectionHeading } from "@/components/SectionHeading";
import { ReleaseCard } from "@/components/ReleaseCard";
import { MerchCard } from "@/components/MerchCard";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { PaymentBadges } from "@/components/PaymentBadges";
import { SpotifyEmbed } from "@/components/SpotifyEmbed";
import { Reveal } from "@/components/Reveal";
import { Marquee } from "@/components/Marquee";
import { site } from "@/config/site";
import { spotifyEmbed } from "@/lib/spotify";

const MARQUEE = [
  "Original Music",
  "Free Beats",
  "Studio WAVs",
  "Exclusive Merch",
  "Feature Bookings",
  "Brand Partnerships",
  "Signed & Limited Drops",
];

export default async function HomePage() {
  const [releases, merch] = await Promise.all([getReleases(true), getMerch(true)]);

  const featuredVideo = releases.find((r) => r.youtubeUrl);
  const latest = releases.slice(0, 3);
  const featuredMerch = merch.slice(0, 4);

  // Home "Now Streaming" player: prefer the artist/playlist link, else the
  // first featured release that has an embeddable Spotify URL.
  const spotifyFeatureUrl = spotifyEmbed(site.streaming.spotify)
    ? site.streaming.spotify
    : releases.find((r) => spotifyEmbed(r.spotifyUrl))?.spotifyUrl ?? null;

  return (
    <>
      <Hero />

      {/* Marquee band */}
      <div className="border-y border-white/[0.06] bg-white/[0.015] py-5">
        <Marquee>
          {MARQUEE.map((m) => (
            <span key={m} className="inline-flex items-center gap-12">
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
                {m}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
          ))}
        </Marquee>
      </div>

      {/* Latest releases */}
      <section className="container-page py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Music"
            title="Latest Releases"
            subtitle="Stream on your favourite platform, or buy the MP3 to support directly."
            href="/music"
          />
        </Reveal>
        {latest.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((r, i) => (
              <Reveal key={r.id} delay={i * 0.08}>
                <ReleaseCard release={r} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState text="Releases will appear here once added in the dashboard." />
        )}
      </section>

      {/* Now Streaming — Spotify player */}
      {spotifyFeatureUrl && (
        <section className="relative overflow-hidden py-12">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-72 -translate-y-1/2 bg-[radial-gradient(60%_100%_at_50%_50%,rgba(45,212,191,0.12),transparent)]" />
          <div className="container-page relative grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <div>
                <p className="eyebrow mb-3">
                  <span className="h-px w-6 bg-accent" />
                  Now Streaming
                </p>
                <h2 className="display-sm text-white text-balance">
                  Press play. Every stream counts.
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-neutral-400">
                  Listen right here on Spotify — or own the track with a download to
                  support directly. Your call.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/music" className="btn-accent">
                    Browse all music
                  </Link>
                  {site.streaming.spotify && (
                    <a
                      href={site.streaming.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline"
                    >
                      Follow on Spotify
                    </a>
                  )}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="shadow-card">
                <SpotifyEmbed url={spotifyFeatureUrl} title="Dark Music Yard on Spotify" />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Featured video spotlight */}
      {featuredVideo && (
        <section className="relative overflow-hidden py-12">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 h-72 -translate-y-1/2 bg-[radial-gradient(60%_100%_at_50%_50%,rgba(124,92,255,0.14),transparent)]" />
          <div className="container-page relative">
            <Reveal>
              <SectionHeading eyebrow="Watch" title={featuredVideo.title} />
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mx-auto max-w-4xl shadow-card">
                <YouTubeEmbed url={featuredVideo.youtubeUrl} title={featuredVideo.title} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Featured merch */}
      <section className="container-page py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Merch"
            title="Featured Merchandise"
            subtitle="Wear the brand. Limited and signed pieces drop here first."
            href="/merch"
          />
        </Reveal>
        {featuredMerch.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredMerch.map((m, i) => (
              <Reveal key={m.id} delay={i * 0.08}>
                <MerchCard product={m} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState text="Merch will appear here once added in the dashboard." />
        )}
      </section>

      {/* Booking + brand CTAs */}
      <section className="container-page py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <CtaCard
              title="Book a Feature"
              body="Verses, hooks, collaborations and performance bookings for artists, managers and labels."
              href="/features"
              cta="Make an inquiry"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <CtaCard
              title="Brand Promotion"
              body="Product placement, sponsored content and event partnerships through DMY content."
              href="/brand-promotion"
              cta="Partner with us"
            />
          </Reveal>
        </div>
      </section>

      {/* Payment reassurance */}
      <section className="container-page pb-14 pt-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-ink-700/80 to-ink-800/80 p-12 text-center">
            <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(50%_100%_at_50%_100%,rgba(45,212,191,0.2),transparent)]" />
            <p className="eyebrow justify-center">Stream everywhere. Support directly here.</p>
            <h2 className="display-sm mx-auto mt-4 max-w-xl text-white text-balance">
              Secure checkout for downloads &amp; merch
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-neutral-400">
              Pay with cards or Mobile Money — instant delivery for digital items.
            </p>
            <div className="mt-7 flex flex-col items-center gap-5">
              <PaymentBadges className="justify-center" />
              <Link href="/music" className="btn-accent">
                Start listening
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="card p-12 text-center text-sm text-neutral-500">{text}</div>;
}

function CtaCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="group relative h-full overflow-hidden rounded-3xl border border-white/[0.06] bg-ink-700/70 p-8 transition-all duration-500 hover:border-accent/30">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/10 blur-3xl transition-transform duration-700 group-hover:scale-150" />
      <div className="relative flex h-full flex-col justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">{body}</p>
        </div>
        <Link
          href={href}
          className="group/link inline-flex items-center gap-1.5 self-start text-sm font-semibold text-accent"
        >
          {cta}
          <span className="transition-transform group-hover/link:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  );
}
