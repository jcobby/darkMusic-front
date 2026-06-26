"use client";

import { useEffect, useState } from "react";
import { recordVisit, getVisitTotal } from "@/lib/api";

const SESSION_KEY = "dmy_visit_counted";

/**
 * Public visit counter shown in the footer. Records one visit per browser
 * session (so refreshes/navigation don't inflate it) and displays the total.
 */
export function VisitCounter() {
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => {
    const counted = sessionStorage.getItem(SESSION_KEY);
    const run = counted ? getVisitTotal() : recordVisit();
    run.then((v) => {
      if (v !== null) {
        setVisits(v);
        sessionStorage.setItem(SESSION_KEY, "1");
      }
    });
  }, []);

  if (visits === null) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
      {visits.toLocaleString()} visits
    </span>
  );
}
