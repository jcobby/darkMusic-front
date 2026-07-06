"use client";

import Link from "next/link";
import { useFanAuth } from "./FanAuthProvider";

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Heart toggle to save a track. Prompts sign-in for logged-out visitors. */
export function FavoriteButton({
  kind,
  refId,
  className = "",
}: {
  kind: "release" | "beat";
  refId: string;
  className?: string;
}) {
  const { user, isFavorite, toggleFavorite } = useFanAuth();

  if (!user) {
    return (
      <Link
        href="/account"
        aria-label="Sign in to save"
        title="Sign in to save"
        className={`grid place-items-center text-neutral-400 transition-colors hover:text-accent ${className}`}
      >
        <Heart filled={false} />
      </Link>
    );
  }

  const active = isFavorite(kind, refId);
  return (
    <button
      type="button"
      aria-label={active ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={active}
      onClick={() => void toggleFavorite(kind, refId)}
      className={`grid place-items-center transition-colors ${
        active ? "text-accent" : "text-neutral-400 hover:text-accent"
      } ${className}`}
    >
      <Heart filled={active} />
    </button>
  );
}
