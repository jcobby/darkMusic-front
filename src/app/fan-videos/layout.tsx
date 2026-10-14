import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Fan Video 2026 — Vote & Win GH₵4,000",
  description: "Lenko Army🧠🖤 showing love for Dark Music Yard. Vote for the best fan video — the winner takes GH₵4,000.",
  alternates: { canonical: "/fan-videos" },
};

export default function FanVideosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
