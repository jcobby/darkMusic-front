import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your account",
  description: "Sign in to Dark Music Yard — your points, streak, bids, bookings and live show tickets.",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
