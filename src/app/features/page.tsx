import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { InquiryForm } from "@/components/InquiryForm";

export const metadata: Metadata = {
  title: "Features",
  description: "Book verse features, hooks, collaborations and performances with DMY.",
};

const SERVICES = [
  { title: "Verse Features", body: "A full verse delivered on your track." },
  { title: "Hook Features", body: "Catchy, radio-ready hooks and choruses." },
  { title: "Collaborations", body: "Joint records and creative partnerships." },
  { title: "Performance Bookings", body: "Live shows, events and appearances." },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="For artists, managers & labels"
        title="Features & Bookings"
        subtitle="Tell us what you need and your budget — pricing is handled case by case."
      />
      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-xl font-bold text-white">Services</h2>
          <ul className="mt-5 space-y-3">
            {SERVICES.map((s) => (
              <li key={s.title} className="card p-4">
                <p className="font-semibold text-white">{s.title}</p>
                <p className="mt-1 text-sm text-neutral-400">{s.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-5 text-xl font-bold text-white">Make an inquiry</h2>
          <InquiryForm type="feature" />
        </div>
      </section>
    </>
  );
}
