import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lenko Army",
  description: "The Lenko Army (LA) — Lenko Psycho's fan community. Shout-outs, merch photos and reactions.",
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
