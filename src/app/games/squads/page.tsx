import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SquadsView } from "@/components/games/SquadsView";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Squads — Beat Breaker",
  description: "Squad up with 2–4 other fans on Dark Music Yard: your Beat Breaker scores add up on the squad board, and your squad's tag shows on every board.",
  alternates: { canonical: "/games/squads" },
};

export default function SquadsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Beat Breaker · Squads"
        title="Squads"
        subtitle="Team up with 3–5 fans — every member's Beat Breaker score this month adds up for the squad."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page py-8 sm:py-12">
        <SquadsView />
      </section>
    </>
  );
}
