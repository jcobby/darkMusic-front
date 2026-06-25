"use client";

import { useEffect, useRef } from "react";
import { getWelcomeTrack, type WelcomeTrack } from "@/lib/api";
import { spotifyEmbed } from "@/lib/spotify";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { useSpotifyPlayer } from "./SpotifyPlayer";

const STORAGE_KEY = "dmy_welcomed";

/**
 * Plays the admin-chosen welcome track (release or beat) on a first-time
 * visitor's first *gesture* (click/tap/keypress). Scroll is deliberately
 * excluded — it doesn't grant autoplay permission, so playing on scroll just
 * gets blocked. We only mark the visit "welcomed" once playback actually
 * starts, so a blocked attempt retries on the next gesture. Fires once ever.
 */
export function WelcomeAutoplay() {
  const { play: playAudio } = useAudioPlayer();
  const { play: playSpotify } = useSpotifyPlayer();
  const doneRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    let track: WelcomeTrack | null = null;
    getWelcomeTrack().then((t) => {
      track = t;
    });

    // Only events that grant autoplay permission — NOT scroll.
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, start));

    function finish() {
      doneRef.current = true;
      localStorage.setItem(STORAGE_KEY, "1");
      cleanup();
    }

    async function start() {
      if (doneRef.current || busyRef.current || !track) return;
      busyRef.current = true;
      try {
        if (track.kind === "release" && spotifyEmbed(track.spotifyUrl)) {
          finish();
          playSpotify(track.spotifyUrl as string);
        } else if (track.audioUrl) {
          // Resolves only if playback actually starts; otherwise we retry.
          await playAudio({
            id: `${track.kind}:${track.id}`,
            title: track.title,
            src: track.audioUrl,
            coverImage: track.coverImage,
            preview: track.kind === "release",
            subtitle: track.kind === "beat" ? "Free beat" : undefined,
            fullHref: track.kind === "release" ? `/music/${track.slug}` : undefined,
          });
          finish();
        } else {
          finish(); // nothing playable
        }
      } catch {
        /* blocked (not a valid gesture yet) — keep listening, retry next gesture */
      } finally {
        busyRef.current = false;
      }
    }

    events.forEach((e) => window.addEventListener(e, start, { passive: true }));
    return cleanup;
  }, [playAudio, playSpotify]);

  return null;
}
