"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { site } from "@/config/site";
import { StreamingLinks } from "./StreamingLinks";

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

export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      {/* Artist photo (drop /public/artist-hero.jpg to enable) */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: "url('/artist-hero.jpg')" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container-page relative py-28"
      >
        <motion.div variants={item}>
          <span className="eyebrow rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Dark Music Yard
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="display mt-7 max-w-4xl text-white text-balance"
        >
          Stream everywhere.
          <br />
          <span className="gradient-text">Support directly here.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-7 max-w-xl text-lg leading-relaxed text-neutral-300/90"
        >
          The official home for DMY — music, free beats, exclusive merch,
          feature bookings and brand partnerships, all in one place.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Link href="/music" className="btn-accent">
            Explore Music
          </Link>
          <Link href="/free-beats" className="btn-outline">
            Free Beats
          </Link>
          <Link href="/features" className="btn-ghost group">
            Book a Feature
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
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
