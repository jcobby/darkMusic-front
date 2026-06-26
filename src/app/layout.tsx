import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/config/site";
import { CartProvider } from "@/components/CartProvider";
import { AudioPlayerProvider } from "@/components/AudioPlayerProvider";
import { SpotifyPlayerProvider } from "@/components/SpotifyPlayer";
import { MiniPlayer } from "@/components/MiniPlayer";
import { WelcomeAutoplay } from "@/components/WelcomeAutoplay";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Aurora } from "@/components/Aurora";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  metadataBase: new URL(site.url),
  openGraph: {
    title: site.name,
    description: site.description,
    type: "website",
  },
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="grain relative min-h-screen overflow-x-hidden bg-ink font-sans text-neutral-200">
        <Aurora />
        <CartProvider>
          <AudioPlayerProvider>
            <SpotifyPlayerProvider>
              <div className="relative z-10">
                <Navbar />
                <main className="min-h-[60vh]">{children}</main>
                <Footer />
              </div>
              <MiniPlayer />
              <WelcomeAutoplay />
            </SpotifyPlayerProvider>
          </AudioPlayerProvider>
        </CartProvider>
      </body>
    </html>
  );
}
