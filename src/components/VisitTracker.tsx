"use client";

import { useEffect } from "react";
import { recordVisit } from "@/lib/api";

const SESSION_KEY = "dmy_visit_counted";

/**
 * Silently records one visit per browser session (so refreshes/navigation don't
 * inflate it). The total is only viewable by the admin in the dashboard.
 */
export function VisitTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    recordVisit().then((v) => {
      if (v !== null) sessionStorage.setItem(SESSION_KEY, "1");
    });
  }, []);

  return null;
}
