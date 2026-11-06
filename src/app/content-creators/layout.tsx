import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dark Music Yard Creator Spotlight 2026",
  description:
    "A music promotion campaign for creators using Lenko Psycho's songs in their videos. Fans vote for free; the most-voted creator by 31 December 2026 receives recognition and a GH₵4,000 promotional reward sponsored by Dark Music Yard.",
  alternates: { canonical: "/content-creators" },
};

export default function ContentCreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
