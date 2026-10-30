import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PromoterDashboard } from "@/components/PromoterDashboard";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Lenko Army Promoters — Share Your Link, Earn Every Month",
  description:
    "Get your own Lenko Army link, share Lenko Psycho on YouTube and earn GH₵50 at 1,000 clicks or GH₵400 at 3,000 clicks every month. One person, one account.",
  alternates: { canonical: "/community/promote" },
};

export default function PromotePage() {
  return (
    <>
      <PageHeader
        eyebrow="Lenko Army · Promoters"
        title="Share the link. Get paid."
        subtitle="Every Lenko Army member gets a personal link to Lenko Psycho on YouTube. Hit 1,000 clicks in a month for GH₵50 — or 3,000 for GH₵400."
        image={PHOTOS.couchCrewColor}
      />
      <section className="container-page py-10 sm:py-14">
        <PromoterDashboard />
      </section>
    </>
  );
}
