import type { Metadata } from "next";
import { getBeats } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { BeatCard } from "@/components/BeatCard";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Free Beats",
  description: "Free MP3 instrumentals for artists and creators. Buy the studio WAV for GH₵100.",
};

export default async function FreeBeatsPage() {
  const beats = await getBeats();

  return (
    <>
      <PageHeader
        eyebrow="Free Beats"
        title="Beats for Artists & Creators"
        subtitle="Download the MP3 free to create with. Grab the original high-quality studio WAV for GH₵100."
      />
      <section className="container-page py-12">
        {beats.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {beats.map((b, i) => (
              <Reveal key={b.id} delay={(i % 3) * 0.08}>
                <BeatCard beat={b} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-neutral-500">
            No beats yet. Add them from the{" "}
            <a href="/admin" className="text-accent">
              admin dashboard
            </a>
            .
          </div>
        )}
      </section>
    </>
  );
}
