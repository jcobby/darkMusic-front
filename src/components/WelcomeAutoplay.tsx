"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
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

/** A welcome SONG plays this long, then fades out (a welcome BEAT loops instead). */
const SONG_CLIP_SECONDS = 30;
const SONG_PLAYED_KEY = "dmy_welcome_song_played";

function songPlayedThisVisit(): boolean {
  try {
    return sessionStorage.getItem(SONG_PLAYED_KEY) === "1";
  } catch {
    return false;
  }
}
function markSongPlayed() {
  try {
    sessionStorage.setItem(SONG_PLAYED_KEY, "1");
  } catch {
    /* private mode — it may play again on the next page load */
  }
}

/**
 * Site soundtrack, chosen in admin. A welcome song (a release with its MP3
 * uploaded) plays a 30-second taste once per visit, then fades out. A welcome
 * beat plays on every page load and loops until the visitor pauses it. Either
 * starts instantly when the browser already trusts the visitor; otherwise on
 * their first gesture (click/tap/key — scroll can't autoplay).
 */
export function WelcomeAutoplay() {
  const { play: playAudio } = useAudioPlayer();
  const { play: playSpotify } = useSpotifyPlayer();
  const pathname = usePathname();
  const doneRef = useRef(false);
  const busyRef = useRef(false);
  // The games play their own free-beat soundtrack, so don't start this one there.
  const inGames = pathname?.startsWith("/games") ?? false;

  useEffect(() => {
    if (typeof window === "undefined" || inGames) return;

    let track: WelcomeTrack | null = null;

    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, onGesture));
    const finish = () => {
      doneRef.current = true;
      cleanup();
    };

    // Only when there's no uploaded MP3 to play a clip of.
    const isSpotifyRelease = (t: WelcomeTrack) =>
      t.kind === "release" && !t.audioUrl && Boolean(spotifyEmbed(t.spotifyUrl));

    const audioTrack = (t: WelcomeTrack) => ({
      id: `${t.kind}:${t.id}`,
      title: t.title,
      src: t.audioUrl as string,
      coverImage: t.coverImage,
      preview: t.kind === "release",
      subtitle: t.kind === "beat" ? "Free beat" : undefined,
      // A catalogue release links to its page; the game-music welcome song to Spotify.
      fullHref: t.kind === "release" ? (t.slug ? `/music/${t.slug}` : t.spotifyUrl ?? undefined) : undefined,
      // A beat loops until the visitor pauses; a song plays a short taste.
      loop: t.kind === "beat",
      clipSeconds: t.kind === "release" ? SONG_CLIP_SECONDS : undefined,
    });

    async function attemptAudio(): Promise<boolean> {
      if (doneRef.current || busyRef.current || !track || !track.audioUrl) return false;
      busyRef.current = true;
      try {
        await playAudio(audioTrack(track)); // throws if the browser blocks it
        if (track.kind === "release") markSongPlayed();
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
        markSongPlayed();
        playSpotify(track.spotifyUrl as string);
        return;
      }
      await attemptAudio();
    }

    getWelcomeTrack().then((t) => {
      // The welcome song greets each visit once — not on every page reload.
      if (t?.kind === "release" && songPlayedThisVisit()) {
        finish();
        return;
      }
      track = t;
      if (track && track.audioUrl && !isSpotifyRelease(track) && autoplayAllowed()) {
        attemptAudio();
      }
    });

    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }));
    return cleanup;
  }, [playAudio, playSpotify, inGames]);

  return null;
}
