"use client";

import { useEffect, useRef } from "react";
import { getWelcomeTrack, type WelcomeTrack } from "@/lib/api";
import { spotifyEmbed } from "@/lib/spotify";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { useSpotifyPlayer } from "./SpotifyPlayer";

/** True only when the browser already permits sound to autoplay for this visitor. */
function autoplayAllowed(): boolean {
  const nav = navigator as Navigator & { getAutoplayPolicy?: (t: string) => string };
  try {
    return typeof nav.getAutoplayPolicy === "function"
      ? nav.getAutoplayPolicy("mediaelement") === "allowed"
      : false;
  } catch {
    return false;
  }
}

/**
 * Site soundtrack: the admin-chosen track plays on every visit and loops,
 * until the visitor pauses it. It starts instantly when the browser already
 * trusts the visitor; otherwise on their first gesture (click/tap/key — scroll
 * can't autoplay). Once started (or paused by the user) it won't re-trigger for
 * that page load; a full reload starts it again.
 */
export function WelcomeAutoplay() {
  const { play: playAudio } = useAudioPlayer();
  const { play: playSpotify } = useSpotifyPlayer();
  const doneRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let track: WelcomeTrack | null = null;

    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, onGesture));
    const finish = () => {
      doneRef.current = true;
      cleanup();
    };

    const isSpotifyRelease = (t: WelcomeTrack) =>
      t.kind === "release" && Boolean(spotifyEmbed(t.spotifyUrl));

    const audioTrack = (t: WelcomeTrack) => ({
      id: `${t.kind}:${t.id}`,
      title: t.title,
      src: t.audioUrl as string,
      coverImage: t.coverImage,
      preview: t.kind === "release",
      subtitle: t.kind === "beat" ? "Free beat" : undefined,
      fullHref: t.kind === "release" ? `/music/${t.slug}` : undefined,
      loop: true, // play continuously until the visitor pauses
    });

    async function attemptAudio(): Promise<boolean> {
      if (doneRef.current || busyRef.current || !track || !track.audioUrl) return false;
      busyRef.current = true;
      try {
        await playAudio(audioTrack(track)); // throws if the browser blocks it
        finish();
        return true;
      } catch {
        return false; // not yet allowed — wait for a gesture
      } finally {
        busyRef.current = false;
      }
    }

    async function onGesture() {
      if (doneRef.current || busyRef.current || !track) return;
      if (isSpotifyRelease(track)) {
        finish();
        playSpotify(track.spotifyUrl as string);
        return;
      }
      await attemptAudio();
    }

    getWelcomeTrack().then((t) => {
      track = t;
      if (track && track.audioUrl && !isSpotifyRelease(track) && autoplayAllowed()) {
        attemptAudio();
      }
    });

    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }));
    return cleanup;
  }, [playAudio, playSpotify]);

  return null;
}
