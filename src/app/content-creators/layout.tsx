import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Content Creator 2026 — Vote & Win GH₵4,000",
  description: "Watch videos from creators hyping Dark Music Yard and vote for the best one. The most-voted creator wins GH₵4,000.",
  alternates: { canonical: "/content-creators" },
};

export default function ContentCreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
