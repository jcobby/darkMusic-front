import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { site, latestRelease } from "@/config/site";
import { JsonLd, siteGraph } from "@/components/JsonLd";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CartProvider } from "@/components/CartProvider";
import { FanAuthProvider } from "@/components/FanAuthProvider";
import { AudioPlayerProvider } from "@/components/AudioPlayerProvider";
import { SpotifyPlayerProvider } from "@/components/SpotifyPlayer";
import { MiniPlayer } from "@/components/MiniPlayer";
import { WelcomeAutoplay } from "@/components/WelcomeAutoplay";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Aurora } from "@/components/Aurora";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ContestPopup } from "@/components/ContestPopup";
import { AuctionAlerts } from "@/components/AuctionAlerts";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Lenko Psycho · Ghana Hip-Hop, Free Beats & Merch`,
    template: `%s · ${site.name}`,
  },
  description:
    "The official home of Lenko Psycho and Dark Music Yard (DMY): stream the new single, download free beats, play music games, shop merch and watch live shows. Ghana hip-hop.",
  keywords: [
    "Lenko Psycho",
    "Dark Music Yard",
    "DMY",
    "Ghana hip hop",
    "Ghana rap",
    "free beats",
    "Ghana music",
    latestRelease.title,
    "Roddy Hanz",
    "Lenko Army",
  ],
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  category: "music",
  // Each page's own <title>/description are used for previews; the share image is app/opengraph-image.tsx.
  openGraph: { type: "website", siteName: site.name, locale: "en_GB" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/logo.svg" },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#050507",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="grain relative min-h-screen overflow-x-hidden bg-ink font-sans text-neutral-200">
        <JsonLd data={siteGraph()} />
        <Aurora />
        <FanAuthProvider>
          <CartProvider>
            <AudioPlayerProvider>
              <SpotifyPlayerProvider>
                <div className="relative z-10">
                  <AnnouncementBar />
                  <Navbar />
                  <main className="min-h-[60vh]">{children}</main>
                  <Footer />
                </div>
                <MiniPlayer />
                <WelcomeAutoplay />
                <ContestPopup />
                <AuctionAlerts />
              </SpotifyPlayerProvider>
              {/* Real-visitor Core Web Vitals (turn on Speed Insights in the Vercel dashboard) */}
              <SpeedInsights />
            </AudioPlayerProvider>
          </CartProvider>
        </FanAuthProvider>
      </body>
    </html>
  );
}
