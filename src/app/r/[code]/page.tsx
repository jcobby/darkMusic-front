import type { Metadata } from "next";
import { getPromoInfo } from "@/lib/api";
import { site } from "@/config/site";
import { PromoRedirect } from "@/components/PromoRedirect";

// A Lenko Army member's promoter link: counts the visit, then on to YouTube.
export const metadata: Metadata = {
  title: "Lenko Psycho on YouTube",
  description: "Shared by the Lenko Army 🧠🖤 — watch, subscribe and turn on notifications.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Lenko Psycho on YouTube 🧠🖤",
    description: "Shared by the Lenko Army — watch, subscribe and turn on notifications.",
  },
};

export default async function PromoLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const info = await getPromoInfo();
  return <PromoRedirect code={code} target={info?.target || site.social.youtube} />;
}
