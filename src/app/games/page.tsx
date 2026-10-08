import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { GamesGrid } from "@/components/games/GamesGrid";
import { PHOTOS } from "@/config/media";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Play DMY games to DMY's free beats — Beat Tap, Vinyl Catch, Memory Match, Name That Cover and DMY Trivia.",
};

export default function GamesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Play"
        title="DMY Games"
        subtitle="Every game plays to DMY's free beats — and in Beat Tap, the beat is the game. Free, no sign-in; best scores are saved on this device."
        image={PHOTOS.couchDuoColor}
      />
      <section className="container-page py-12">
        <GamesGrid />
      </section>
    </>
  );
}
