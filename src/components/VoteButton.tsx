"use client";

import Link from "next/link";
import { useState } from "react";
import { useFanAuth, getFanToken } from "./FanAuthProvider";
import { voteVideo } from "@/lib/api";

/** "Best video" contest vote. Each fan has one vote; clicking moves it here. */
export function VoteButton({
  videoId,
  voteCount,
  myVote,
  onChanged,
}: {
  videoId: string;
  voteCount: number;
  myVote: boolean;
  onChanged?: () => void;
}) {
  const { user } = useFanAuth();
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <Link href="/account" className="btn-outline text-sm">
        👑 Sign in to vote · {voteCount}
      </Link>
    );
  }

  async function vote() {
    const token = getFanToken();
    if (!token || busy) return;
    setBusy(true);
    try {
      await voteVideo(token, videoId);
      onChanged?.(); // reload the leaderboard (ranks/counts + moved vote)
    } catch {
      /* ignore — next reload reconciles */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={vote}
      disabled={busy}
      className={`${myVote ? "btn-accent" : "btn-outline"} text-sm`}
      title={myVote ? "Your pick — click to undo" : "Vote this as the best"}
    >
      {myVote ? "★ Your pick" : "👑 Vote best"} · {voteCount}
    </button>
  );
}
