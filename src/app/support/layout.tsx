import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support the Artist",
  description: "Back Lenko Psycho and Dark Music Yard directly — tip any amount with Mobile Money or card to fund new music, videos and shows.",
  alternates: { canonical: "/support" },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
