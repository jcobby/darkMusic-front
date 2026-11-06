import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Fan Video 2026 — Lenko Army Fan Zone",
  description: "Lenko Army🧠🖤 showing love for Lenko Psycho's music. Vote for free for your favourite fan video — the most-voted fan by 31 December 2026 receives a GH₵4,000 fan appreciation reward sponsored by Dark Music Yard.",
  alternates: { canonical: "/fan-videos" },
};

export default function FanVideosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
