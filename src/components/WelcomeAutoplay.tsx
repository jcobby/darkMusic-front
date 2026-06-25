"use client";

import { useEffect, useRef } from "react";
import {
  getWelcomeTrack,
  releasePreviewUrl,
  downloadFreeBeatUrl,
  type WelcomeTrack,
} from "@/lib/api";
import { spotifyEmbed } from "@/lib/spotify";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { useSpotifyPlayer } from "./SpotifyPlayer";

const STORAGE_KEY = "dmy_welcomed";

/**
 * Plays the admin-chosen welcome track (a release OR a beat) on a first-time
 * visitor's first interaction (click/scroll/tap/keypress). Browsers block sound
 * before any interaction, so we arm a one-shot listener instead of autoplaying
 * on load. Fires once ever per browser (localStorage-gated).
 */
export function WelcomeAutoplay() {
  const { play: playAudio } = useAudioPlayer();
  const { play: playSpotify } = useSpotifyPlayer();
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    let track: WelcomeTrack | null = null;
    getWelcomeTrack().then((t) => {
      track = t;
    });

    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    const cleanup = () =>
      events.forEach((e) => window.removeEventListener(e, start));

    function start() {
      if (startedRef.current || !track) return; // wait until the track is loaded
      startedRef.current = true;
      localStorage.setItem(STORAGE_KEY, "1");
      cleanup();

      if (track.kind === "release") {
        if (spotifyEmbed(track.spotifyUrl)) {
          playSpotify(track.spotifyUrl as string);
        } else if (track.hasPreview) {
          playAudio({
            id: `release:${track.id}`,
            title: track.title,
            src: releasePreviewUrl(track.slug),
            coverImage: track.coverImage,
            preview: true,
            fullHref: `/music/${track.slug}`,
          });
        }
      } else if (track.kind === "beat" && track.hasFreeMp3) {
        playAudio({
          id: `beat:${track.id}`,
          title: track.title,
          subtitle: "Free beat",
          src: downloadFreeBeatUrl(track.slug),
          coverImage: track.coverImage,
        });
      }
    }

    events.forEach((e) => window.addEventListener(e, start, { passive: true }));
    return cleanup;
  }, [playAudio, playSpotify]);

  return null;
}
