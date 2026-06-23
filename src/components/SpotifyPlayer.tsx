"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { spotifyEmbed } from "@/lib/spotify";

interface SpotifyController {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
}
interface SpotifyIFrameApi {
  createController: (
    el: HTMLElement,
    options: { uri: string; width: string | number; height: string | number },
    cb: (controller: SpotifyController) => void
  ) => void;
}
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameApi) => void;
  }
}

interface SpotifyContextValue {
  /** Play a Spotify track/album/playlist URL in the bottom bar. */
  play: (spotifyUrl: string) => void;
  /** id of the currently loaded Spotify entity (or null). */
  activeId: string | null;
  close: () => void;
}

const Ctx = createContext<SpotifyContextValue | null>(null);

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<SpotifyController | null>(null);
  const pendingUri = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      const el = document.getElementById("dmy-spotify-embed");
      if (!el) return;
      IFrameAPI.createController(
        el,
        { uri: "", width: "100%", height: 80 },
        (controller) => {
          controllerRef.current = controller;
          if (pendingUri.current) {
            controller.loadUri(pendingUri.current);
            controller.play();
            pendingUri.current = null;
          }
        }
      );
    };

    if (!document.getElementById("spotify-iframe-api-script")) {
      const s = document.createElement("script");
      s.id = "spotify-iframe-api-script";
      s.src = "https://open.spotify.com/embed/iframe-api/v1";
      s.async = true;
      document.body.appendChild(s);
    }

    // Pause/hide Spotify when the local MP3 player starts.
    const onStop = () => {
      controllerRef.current?.pause();
      setActiveId(null);
    };
    window.addEventListener("dmy:stop-spotify", onStop);
    return () => window.removeEventListener("dmy:stop-spotify", onStop);
  }, []);

  const play = useCallback((spotifyUrl: string) => {
    const info = spotifyEmbed(spotifyUrl);
    if (!info) return;
    const uri = `spotify:${info.type}:${info.id}`;
    setActiveId(info.id);
    // Stop the local MP3 mini-player so the two never overlap.
    window.dispatchEvent(new Event("dmy:stop-audio"));
    if (controllerRef.current) {
      controllerRef.current.loadUri(uri);
      controllerRef.current.play();
    } else {
      pendingUri.current = uri; // play as soon as the controller is ready
    }
  }, []);

  const close = useCallback(() => {
    controllerRef.current?.pause();
    setActiveId(null);
  }, []);

  return (
    <Ctx.Provider value={{ play, activeId, close }}>
      {children}
      {/* Always mounted so the iFrame controller can bind; slides up when active. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 px-3 pb-3 transition-transform duration-300 sm:px-5 ${
          activeId ? "translate-y-0" : "pointer-events-none translate-y-[120%]"
        }`}
      >
        <div className="glass mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-white/10 p-2 shadow-card">
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl">
            <div id="dmy-spotify-embed" />
          </div>
          <button
            onClick={close}
            aria-label="Close player"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function useSpotifyPlayer(): SpotifyContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSpotifyPlayer must be used within SpotifyPlayerProvider");
  return ctx;
}
