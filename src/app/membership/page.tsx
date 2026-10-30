import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MembershipView } from "@/components/MembershipView";
import { getMembershipPlans } from "@/lib/api";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Become a DMY Supporter — Membership",
  description:
    "The games on Dark Music Yard stay free for everyone. Support monthly as a 💜 Supporter (GH₵10), 💎 VIP (GH₵25) or 👑 Legend (GH₵50) — badges, exclusive Pool cues, Legend colours and your name on the Supporter Wall.",
  alternates: { canonical: "/membership" },
};

export default async function MembershipPage() {
  const plans = await getMembershipPlans();
  return (
    <>
      <PageHeader
        eyebrow="Free for everyone · Real ones support"
        title="Become a Supporter"
        subtitle="We don't charge anyone to play — the games stay free, and DMY Fan Rewards prizes never need a purchase or donation. If you'd like to keep them coming, support Dark Music Yard monthly and get a few perks for it."
        image={PHOTOS.couchCrewBw}
      />
      <section className="container-page py-10 sm:py-14">
        <Suspense fallback={<p className="text-center text-sm text-neutral-500">Loading…</p>}>
          <MembershipView plans={plans} />
        </Suspense>
      </section>
    </>
  );
}
