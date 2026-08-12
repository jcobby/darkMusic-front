import type { Metadata } from "next";
import { getModels } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ModelsGallery } from "@/components/ModelsGallery";
import { UploadCta } from "@/components/UploadCta";
import { Reveal } from "@/components/Reveal";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Book a Model",
  description:
    "Browse models available for booking with Dark Music Yard — music videos, shoots, events and brand promos. Rates GH₵2,000–5,000.",
};

export default async function ModelsPage() {
  const models = await getModels();

  return (
    <>
      <PageHeader
        eyebrow="Booking"
        title="Book a Model"
        subtitle="Models available for music videos, photoshoots, events and brand promos. Browse, then send a free booking request."
      />
      <section className="container-page py-12">
        {models.length ? (
          <>
            <Reveal>
              <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-accent/20 bg-accent/[0.06] px-5 py-3 text-sm text-neutral-300">
                <span className="font-semibold text-accent">Rates GH₵2,000 – GH₵5,000</span>
                <span className="text-neutral-500">·</span>
                <span>Tap a model to see their photos and send a request — no payment upfront.</span>
              </div>
            </Reveal>
            <ModelsGallery models={models} />
          </>
        ) : (
          <div className="card p-12 text-center text-neutral-500">
            Models are being added — check back soon.
          </div>
        )}
        <div className="mt-10">
          <UploadCta
            title="Are you a model?"
            blurb="Sign in and submit your profile to be listed for booking"
            email={site.contact.email}
          />
        </div>
      </section>
    </>
  );
}
