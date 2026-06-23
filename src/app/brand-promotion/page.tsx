import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { InquiryForm } from "@/components/InquiryForm";

export const metadata: Metadata = {
  title: "Brand Promotion",
  description: "Product placement, brand campaigns, sponsored content and event partnerships.",
};

const SERVICES = [
  {
    title: "Product Placement in Music Videos",
    body: "Feature your product naturally within DMY video content.",
  },
  {
    title: "Brand Visibility Campaigns",
    body: "Sustained exposure across releases and social channels.",
  },
  { title: "Sponsored Content", body: "Dedicated content built around your brand." },
  { title: "Event Partnerships", body: "Co-branded shows, activations and appearances." },
];

export default function BrandPromotionPage() {
  return (
    <>
      <PageHeader
        eyebrow="For businesses & agencies"
        title="Brand Promotion"
        subtitle="Reach our audience through DMY content. Pricing is shared privately — submit an inquiry to start."
      />
      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-xl font-bold text-white">Opportunities</h2>
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
          <h2 className="mb-5 text-xl font-bold text-white">Submit an inquiry</h2>
          <InquiryForm type="brand" />
        </div>
      </section>
    </>
  );
}
