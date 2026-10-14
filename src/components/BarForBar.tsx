"use client";

import Link from "next/link";
import { VIDEOS } from "@/config/media";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { Reveal } from "./Reveal";

/**
 * Bar for Bar's breakdown of "It's Working". Plays in place with sound — and
 * pauses the site soundtrack / Spotify bar so they never play over each other.
 */
export function BarForBar({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { playing, toggle } = useAudioPlayer();
  const v = VIDEOS.barForBar;

  function onPlay() {
    if (playing) toggle();
    window.dispatchEvent(new Event("dmy:stop-spotify"));
  }

  return (
    <section className={`container-page ${compact ? "py-10" : "py-12 sm:py-20"} ${className}`}>
      <div className="grid items-center gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
        <Reveal>
          <div>
            <p className="eyebrow mb-3">
              <span className="h-px w-6 bg-accent" /> As featured on Bar for Bar
            </p>
            <h2 className="display-sm text-white text-balance">
              “It&apos;s Working” — <span className="gradient-text">broken down bar for bar</span>
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-neutral-300">
              Every hustle song says it&apos;s working. Bar for Bar shows how — a line-by-line breakdown of Lenko
              Psycho&apos;s “It&apos;s Working” ft. Lalid &amp; Kofi Mole, with scenes from the video.
            </p>
            {!compact && (
              <Link href="/music" className="mt-5 inline-flex min-h-[44px] items-center text-sm font-semibold text-accent hover:underline">
                Stream the music →
              </Link>
            )}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-glow-sm">
            <video
              controls
              playsInline
              preload="none"
              poster={v.poster}
              onPlay={onPlay}
              className="aspect-[53/29] w-full bg-black object-contain"
              aria-label={v.alt}
            >
              <source src={v.src} type="video/mp4" />
            </video>
          </div>
          <p className="mt-2 text-xs text-neutral-500">5 min · Bar for Bar</p>
        </Reveal>
      </div>
    </section>
  );
}
