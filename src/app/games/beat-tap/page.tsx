import type { Metadata } from "next";
import { getBeats } from "@/lib/api";
import { toFreeBeats } from "@/lib/games";
import { BeatTap } from "@/components/games/BeatTap";

export const metadata: Metadata = {
  title: "Beat Tap · Games",
  description: "A rhythm game built from Dark Music Yard's free beats — the drums become notes.",
};

export default async function Page() {
  const beats = toFreeBeats(await getBeats());
  return <BeatTap beats={beats} />;
}