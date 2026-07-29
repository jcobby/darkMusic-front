"use client";

import { useState } from "react";
import Link from "next/link";
import { useFanAuth, getFanToken } from "./FanAuthProvider";
import { rateVideo } from "@/lib/api";

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      className={filled ? "text-accent" : "text-neutral-600"}
    >
      <path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 1–5 star rating for a video. Fans can set their rating; others see the average. */
export function StarRating({
  videoId,
  avg,
  count,
  mine = 0,
  size = 20,
}: {
  videoId: string;
  avg: number;
  count: number;
  mine?: number;
  size?: number;
}) {
  const { user } = useFanAuth();
  const [myStars, setMyStars] = useState(mine);
  const [hover, setHover] = useState(0);
  const [avgR, setAvgR] = useState(avg);
  const [cnt, setCnt] = useState(count);
  const [busy, setBusy] = useState(false);

  async function rate(stars: number) {
    const token = getFanToken();
    if (!token || busy) return;
    const prev = myStars;
    setBusy(true);
    setMyStars(stars); // optimistic
    try {
      const r = await rateVideo(token, videoId, stars);
      setAvgR(r.avgRating);
      setCnt(r.ratingCount);
      setMyStars(r.myStars);
    } catch {
      setMyStars(prev);
    } finally {
      setBusy(false);
    }
  }

  const display = hover || myStars || Math.round(avgR);

  return (
    <div>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) =>
          user ? (
            <button
              key={n}
              type="button"
              disabled={busy}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => rate(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="transition-transform hover:scale-110"
            >
              <Star filled={n <= display} size={size} />
            </button>
          ) : (
            <Star key={n} filled={n <= Math.round(avgR)} size={size} />
          )
        )}
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        {cnt > 0 ? (
          <>
            {avgR.toFixed(1)} · {cnt} rating{cnt > 1 ? "s" : ""}
          </>
        ) : (
          "No ratings yet"
        )}
        {user && myStars ? <span className="text-accent"> · you: {myStars}★</span> : null}
      </p>
      {!user && (
        <Link href="/account" className="text-[11px] text-accent hover:underline">
          Sign in to rate
        </Link>
      )}
    </div>
  );
}
