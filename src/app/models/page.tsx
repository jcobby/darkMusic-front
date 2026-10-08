import type { Metadata } from "next";
import Link from "next/link";
import { getModels } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PHOTOS } from "@/config/media";
import { ModelsGallery } from "@/components/ModelsGallery";
import { UploadCta } from "@/components/UploadCta";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Book a Model",
  description:
    "Book verified models for music videos, photoshoots, commercials, events and brand promos through Dark Music Yard. Starting from GH₵2,000.",
};

const STEPS = [
  ["Choose a model", "See their photos, rate, availability and reviews."],
  ["Send a request", "Pick the date, time, location and shoot type. No payment yet."],
  ["Pay to confirm", "Once the model accepts, pay securely through DMY."],
  ["Get connected", "Contact details are shared as soon as the booking is paid."],
];

export default async function ModelsPage() {
  const models = await getModels();

  return (
    <>
      <PageHeader
        eyebrow="DMY Models"
        title="Book a Model"
        subtitle="Models for music videos, photoshoots, commercials, events and brand promos — every profile reviewed by DMY."
        image={PHOTOS.couchCrewColor}
      />
      <section className="container-page py-12">
        <Reveal>
          <div className="mb-8 rounded-2xl border border-accent/20 bg-accent/[0.06] p-5">
            <p className="text-sm font-semibold text-accent">Starting from GH₵2,000 · each model sets their own rate</p>
            <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="block text-xs leading-relaxed text-neutral-400">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        {models.length ? (
          <ModelsGallery models={models} />
        ) : (
          <div className="card p-12 text-center text-neutral-500">
            Models are being added — check back soon.
          </div>
        )}
        <div className="mt-10">
          <UploadCta
            title="Are you a model?"
            blurb="Register from your account to be listed for paid bookings. DMY reviews every profile."
            cta="Register as a model"
          />
          <p className="mt-3 text-center text-xs text-neutral-500">
            Read the{" "}
            <Link href="/models/terms" className="text-accent hover:underline">
              DMY Models Terms
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
