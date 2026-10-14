"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { site, latestRelease, latestReleaseLabel } from "@/config/site";
import { spotifyEmbed } from "@/lib/spotify";
import { useSpotifyPlayer } from "./SpotifyPlayer";
import { VIDEOS } from "@/config/media";
import { StreamingLinks } from "./StreamingLinks";
import { SocialLinks } from "./SocialLinks";
import { useAudioPlayer } from "./AudioPlayerProvider";

// Cinematic hero video: a muted cut from a DMY music video (public/video), or
// NEXT_PUBLIC_HERO_VIDEO_URL (e.g. a Cloudinary URL). If it can't play, the
// poster frame shows instead.
const HERO_VIDEO = process.env.NEXT_PUBLIC_HERO_VIDEO_URL || VIDEOS.hero.src;
const HERO_POSTER = VIDEOS.hero.poster;

// The four things most fans come to do, one thumb-tap each on a phone.
const QUICK = [
  { href: "/#latest", label: "Listen", sub: "The new single", icon: "▶", primary: true },
  { href: "/free-beats", label: "Free beats", sub: "Download MP3s", icon: "⬇", primary: false },
  { href: "/content-creators", label: "Vote", sub: "Win GH₵4,000", icon: "🏆", primary: false },
  { href: "/worn-on-set", label: "Worn on Set", sub: "Bid on shoot fits", icon: "🧥", primary: false },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Live "NOW PLAYING" badge — reflects the site soundtrack (WelcomeAutoplay
 *  starts it on the first tap) and lets the visitor pause/resume once it's on. */
function NowPlaying() {
  const { current, playing, toggle } = useAudioPlayer();
  const { play: playSpotify, activeId } = useSpotifyPlayer();

  if (!current) {
    // Nothing playing yet: one clear tap plays the new single in the site player.
    const latestId = spotifyEmbed(latestRelease.spotifyUrl)?.id;
    const onNow = Boolean(latestId && activeId === latestId);
    return (
      <button
        type="button"
        onClick={() => playSpotify(latestRelease.spotifyUrl)}
        className="group inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.05] py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white transition hover:border-accent/60"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-white shadow-glow-sm transition group-hover:scale-110">
          {onNow ? (
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </span>
        {onNow ? `Playing ${latestRelease.title}` : `Play ${latestRelease.title}`}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="group inline-flex items-center gap-3 rounded-full border border-accent/30 bg-black/40 px-4 py-2 backdrop-blur transition-colors hover:border-accent/60"
    >
      {/* equalizer */}
      <span className="flex h-4 items-end gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="w-0.5 rounded-full bg-accent"
            animate={playing ? { height: [4, 14, 6, 12, 4] } : { height: 4 }}
            transition={
              playing
                ? { duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }
                : { duration: 0.2 }
            }
          />
        ))}
      </span>
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-accent">
          Now Playing
        </span>
        <span className="block max-w-[52vw] truncate text-sm font-medium text-white sm:max-w-xs">
          {current.title}
        </span>
      </span>
      <span className="ml-1 text-neutral-300 transition-colors group-hover:text-white">
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </span>
    </button>
  );
}

export function Hero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoOk, setVideoOk] = useState(true);

  // React can drop the `muted` attribute on first render — set it on the
  // element so muted autoplay is actually allowed by the browser.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = true;
  }, []);

  return (
    <section className="relative flex items-center overflow-hidden sm:min-h-[92vh]">
      {/* Cinematic background: muted looping video, or the poster image as fallback */}
      {videoOk ? (
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-75"
          autoPlay
          muted
          loop
          playsInline
          poster={HERO_POSTER}
          onError={() => setVideoOk(false)}
          aria-hidden
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url('${HERO_POSTER}')` }}
          aria-hidden
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/60 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/50" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container-page relative pb-12 pt-10 sm:py-28"
      >
        <motion.div variants={item} className="flex flex-wrap items-center gap-3">
          {/* The latest release, first thing on the page */}
          <a
            href="#latest"
            className="group inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white shadow-glow-sm transition hover:border-accent hover:bg-accent/25"
          >
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              New
            </span>
            {latestReleaseLabel}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
          <NowPlaying />
        </motion.div>

        <motion.h1 variants={item} className="display mt-5 max-w-4xl text-white text-balance sm:mt-7">
          Stream everywhere.
          <br />
          <span className="gradient-text">Support directly here.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-4 max-w-xl text-base leading-relaxed text-neutral-300/90 sm:mt-7 sm:text-lg"
        >
          The official home for DMY — music, free beats, exclusive merch, feature bookings
          and brand partnerships, all in one place.
        </motion.p>

        <motion.div variants={item} className="mt-9 hidden flex-wrap items-center gap-3 sm:flex">
          <Link href="/music" className="btn-accent">
            Explore Music
          </Link>
          <Link href="/free-beats" className="btn-outline">
            Free Beats
          </Link>
          <Link href="/features" className="btn-ghost group">
            Book a Feature
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </motion.div>

        {/* Phones: the four key actions as big, thumb-reachable tiles */}
        <motion.div variants={item} className="mt-7 grid grid-cols-2 gap-2.5 sm:hidden">
          {QUICK.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className={`flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 text-left transition active:scale-[0.98] ${
                q.primary ? "border-accent bg-accent text-white shadow-glow-sm" : "border-white/10 bg-white/[0.04] text-white"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {q.icon}
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold">{q.label}</span>
                <span className={`block text-[11px] ${q.primary ? "text-white/80" : "text-neutral-400"}`}>{q.sub}</span>
              </span>
            </Link>
          ))}
        </motion.div>

        <motion.div variants={item} className="mt-8 flex flex-wrap gap-x-10 gap-y-6 sm:mt-14">
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              Listen on
            </p>
            <StreamingLinks links={site.streaming} size="md" />
          </div>
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              Follow Lenko
            </p>
            <SocialLinks />
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:block">
        <div className="flex h-10 w-6 justify-center rounded-full border border-white/15 pt-2">
          <span className="h-2 w-1 animate-scroll-cue rounded-full bg-accent" />
        </div>
      </div>
    </section>
  );
}
