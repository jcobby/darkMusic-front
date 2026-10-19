"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useFanAuth } from "./FanAuthProvider";

/**
 * Microsoft Clarity — recordings of real visits and heatmaps of where people tap
 * and scroll (clarity.microsoft.com). Only loads when NEXT_PUBLIC_CLARITY_ID is set,
 * never on /admin, and after the page has finished loading so it can't slow it down.
 * Signed-in fans are tagged with their account id (not their email), which matches
 * the id shown in admin → Customers. Personal details on the account and admin
 * pages are hidden from recordings (data-clarity-mask).
 */
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };
declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

/** Queue calls until Clarity has loaded (the same queue its own snippet sets up). */
function clarity(...args: unknown[]) {
  if (!window.clarity) {
    const q: ClarityFn = (...a: unknown[]) => {
      (q.q = q.q || []).push(a);
    };
    window.clarity = q;
  }
  window.clarity(...args);
}

export function Clarity() {
  const pathname = usePathname() || "/";
  const { user, loading } = useFanAuth();
  const off = !CLARITY_ID || pathname.startsWith("/admin");

  useEffect(() => {
    if (off || loading) return;
    if (user) {
      clarity("identify", user.id);
      clarity("set", "signedIn", "yes");
    } else {
      clarity("set", "signedIn", "no");
    }
  }, [off, loading, user]);

  if (off) return null;
  return (
    <Script id="ms-clarity" strategy="lazyOnload">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(CLARITY_ID)});`}
    </Script>
  );
}
