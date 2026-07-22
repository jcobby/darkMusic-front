"use client";

import Link from "next/link";
import { useState } from "react";
import { useFanAuth, getFanToken } from "./FanAuthProvider";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { getStreamUrl } from "@/lib/api";

/** Plays the FULL song for streaming-pass subscribers; prompts everyone else. */
export function StreamFullButton({
  slug,
  id,
  title,
  coverImage,
}: {
  slug: string;
  id: string;
  title: string;
  coverImage?: string;
}) {
  const { isSubscribed } = useFanAuth();
  const { play } = useAudioPlayer();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!isSubscribed) {
    return (
      <Link href="/account" className="btn-outline">
        Donate to stream (from GH₵5)
      </Link>
    );
  }

  async function playFull() {
    const token = getFanToken();
    if (!token) return;
    setErr(null);
    setLoading(true);
    try {
      const url = await getStreamUrl(token, slug);
      if (!url) {
        setErr("This song isn't available to stream.");
        return;
      }
      await play({ id: `release:${id}`, title, src: url, coverImage, preview: false });
    } catch {
      setErr("Could not start playback.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={playFull} disabled={loading} className="btn-accent">
        {loading ? "Loading…" : "▶ Stream full song"}
      </button>
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
    </div>
  );
}
