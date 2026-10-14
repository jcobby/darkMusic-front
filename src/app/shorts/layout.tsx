import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shorts — Lenko Psycho & DMY clips",
  description: "Short clips from Lenko Psycho and Dark Music Yard: studio moments, snippets and behind-the-scenes.",
  alternates: { canonical: "/shorts" },
};

export default function ShortsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
