import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { StreamingLinks } from "@/components/StreamingLinks";
import { ArtistPoster } from "@/components/ArtistPoster";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Artist Profile",
  description:
    "Lenko Psycho — a Ghanaian hip-hop artist blending lyrical storytelling, street energy and modern production.",
};

const BIO = [
  "Lenko Psycho is a Ghanaian hip-hop artist whose musical journey began in Escondido, San Diego, California, where he recorded his first studio session. After relocating to Ghana, he stepped away from music for a period, taking time to grow personally and creatively before returning with a renewed vision and sound.",
  "Now back in the game, Lenko is focused on building his name as one of the new voices in Ghanaian hip-hop. While his primary focus is authentic Ghanaian rap and hip-hop, he is a versatile artist capable of blending different styles and influences into his music. His sound combines lyrical storytelling, street energy, and modern production, creating records that connect with both local and international audiences.",
  "Although he has previous recording experience, Lenko approaches this chapter of his career with the hunger and determination of a new artist. Every release reflects his commitment to growth, originality, and consistency as he works toward establishing himself in the Ghanaian and global music scene.",
  "With fresh music, a renewed purpose, and an evolving artistic identity, Lenko is ready to make his mark — one record at a time.",
];

export default function AboutPage() {
  return (
    <section className="container-page py-16 sm:py-20">
      <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Poster */}
        <Reveal>
          <ArtistPoster />
        </Reveal>

        {/* Bio */}
        <div>
          <Reveal>
            <p className="eyebrow mb-4">
              <span className="h-px w-6 bg-accent" />
              The Artist
            </p>
            <h1 className="display-sm text-white text-balance">
              One record <span className="gradient-text">at a time.</span>
            </h1>
          </Reveal>

          <div className="mt-7 space-y-5">
            {BIO.map((para, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <p className="text-[15px] leading-relaxed text-neutral-300/90">{para}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-9">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">
                Listen on
              </p>
              <StreamingLinks links={site.streaming} size="md" />
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/music" className="btn-accent">
                Explore Music
              </Link>
              <Link href="/features" className="btn-outline">
                Book a Feature
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
