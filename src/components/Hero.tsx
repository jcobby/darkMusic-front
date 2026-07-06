"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { site } from "@/config/site";
import { StreamingLinks } from "./StreamingLinks";
import { useAudioPlayer } from "./AudioPlayerProvider";

// Cinematic hero video. Drop /public/hero.mp4 OR set NEXT_PUBLIC_HERO_VIDEO_URL
// (e.g. a Cloudinary URL). Until then it gracefully shows the poster image.
const HERO_VIDEO = process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "/hero.mp4";
const HERO_POSTER = "/artist-poster.png";

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

  if (!current) {
    return (
      <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-neutral-300">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        Tap anywhere to play the soundtrack
      </span>
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
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      {/* Cinematic background: muted looping video, or the poster image as fallback */}
      {videoOk ? (
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50"
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container-page relative py-28"
      >
        <motion.div variants={item}>
          <NowPlaying />
        </motion.div>

        <motion.h1 variants={item} className="display mt-7 max-w-4xl text-white text-balance">
          Stream everywhere.
          <br />
          <span className="gradient-text">Support directly here.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-7 max-w-xl text-lg leading-relaxed text-neutral-300/90"
        >
          The official home for DMY — music, free beats, exclusive merch, feature bookings
          and brand partnerships, all in one place.
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
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

        <motion.div variants={item} className="mt-14">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">
            Listen on
          </p>
          <StreamingLinks links={site.streaming} size="md" />
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
