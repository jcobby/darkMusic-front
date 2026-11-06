"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPoolVoice, poolVoiceAction, type PoolVoiceView } from "@/lib/api";
import { getFanToken } from "../../FanAuthProvider";

type Status = "off" | "waiting" | "connecting" | "live" | "failed";
const POLL_ON_MS = 1500; // while on voice
const POLL_OFF_MS = 5000; // otherwise, to show "they're on voice"
const CONNECT_TIMEOUT_MS = 20_000;

/** Wait until the browser has found its network routes (or 2.5 s), so the offer/answer carries them. */
const gathered = (pc: RTCPeerConnection) =>
  new Promise<void>((done) => {
    if (pc.iceGatheringState === "complete") return done();
    const t = setTimeout(done, 2500);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(t);
        done();
      }
    });
  });

/**
 * Live voice with the other player during a DMY Pool match. The sound goes straight between
 * the two phones (WebRTC); the server only passes on how to connect. Player 1 calls, player 2
 * answers; leaving or re-joining starts a fresh connection.
 */
export function VoiceChat({ code, opponent, compact = false }: { code: string; opponent: string; compact?: boolean }) {
  const [status, setStatus] = useState<Status>("off");
  const [themOn, setThemOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const joined = useRef(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const handledOffer = useRef<string | null>(null);
  const startedAt = useRef(0);
  const busy = useRef(false);

  const closePc = useCallback(() => {
    pc.current?.close();
    pc.current = null;
    handledOffer.current = null;
    if (audio.current) audio.current.srcObject = null;
  }, []);

  const newPc = useCallback(
    (iceServers: RTCIceServer[]) => {
      closePc();
      const p = new RTCPeerConnection({ iceServers });
      mic.current?.getTracks().forEach((t) => p.addTrack(t, mic.current!));
      p.ontrack = (e) => {
        if (audio.current) {
          audio.current.srcObject = e.streams[0];
          void audio.current.play().catch(() => {});
        }
      };
      p.onconnectionstatechange = () => {
        if (p !== pc.current) return;
        if (p.connectionState === "connected") {
          setStatus("live");
          setNote(null);
        } else if (p.connectionState === "failed") {
          setStatus("failed");
          setNote("Voice couldn't connect on this network — trying again. The chat still works.");
          closePc(); // the next check starts over
        }
      };
      pc.current = p;
      startedAt.current = Date.now();
      return p;
    },
    [closePc]
  );

  /** One look at the call, and the next step: make the offer, answer it, or take the answer. */
  const step = useCallback(
    async (v: PoolVoiceView) => {
      setThemOn(v.them.joined);
      if (!joined.current) return;
      const token = getFanToken();
      if (!token) return;
      if (!v.me.joined) {
        // The server lost us (a restart, or the page went quiet too long): join again
        closePc();
        return step(await poolVoiceAction(token, code, { action: "join" }));
      }
      if (!v.them.joined) {
        if (pc.current) closePc();
        setStatus("waiting");
        return;
      }
      const p = pc.current;
      // Stuck connecting: start over
      if (p && p.connectionState !== "connected" && Date.now() - startedAt.current > CONNECT_TIMEOUT_MS) {
        closePc();
        setNote("Still connecting… trying again.");
        if (v.role === "offer") return; // a new offer on the next check
      }
      if (v.role === "offer") {
        const cur = pc.current;
        if (!cur || !v.myOffer) {
          // No call yet, or the server dropped it (someone re-joined): make a fresh offer
          const fresh = newPc(v.iceServers);
          setStatus("connecting");
          await fresh.setLocalDescription(await fresh.createOffer());
          await gathered(fresh);
          if (fresh !== pc.current) return;
          await poolVoiceAction(token, code, { action: "offer", sdp: fresh.localDescription!.sdp });
        } else if (cur.signalingState === "have-local-offer" && v.answer) {
          await cur.setRemoteDescription({ type: "answer", sdp: v.answer.sdp });
        }
      } else if (v.offer && v.offer.id !== handledOffer.current) {
        const fresh = newPc(v.iceServers);
        handledOffer.current = v.offer.id;
        setStatus("connecting");
        await fresh.setRemoteDescription({ type: "offer", sdp: v.offer.sdp });
        await fresh.setLocalDescription(await fresh.createAnswer());
        await gathered(fresh);
        if (fresh !== pc.current) return;
        await poolVoiceAction(token, code, { action: "answer", sdp: fresh.localDescription!.sdp, id: v.offer.id });
      }
    },
    [code, closePc, newPc]
  );

  // Check the call: often while on voice, now and then otherwise
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const token = getFanToken();
      // On voice it keeps checking in the background too (the call goes on while they're on WhatsApp)
      if (token && (joined.current || !document.hidden) && !busy.current) {
        busy.current = true;
        try {
          const v = await getPoolVoice(token, code);
          if (live) await step(v);
        } catch {
          /* a missed check — the next one catches up */
        } finally {
          busy.current = false;
        }
      }
      if (live) timer = setTimeout(tick, joined.current ? POLL_ON_MS : POLL_OFF_MS);
    };
    void tick();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [code, step]);

  const leave = useCallback(async () => {
    joined.current = false;
    closePc();
    mic.current?.getTracks().forEach((t) => t.stop());
    mic.current = null;
    setStatus("off");
    setMuted(false);
    const token = getFanToken();
    if (token) await poolVoiceAction(token, code, { action: "leave" }).catch(() => {});
  }, [code, closePc]);

  // Leaving the match page hangs up
  useEffect(
    () => () => {
      if (joined.current) void leave();
    },
    [leave]
  );

  async function join() {
    const token = getFanToken();
    if (!token) return;
    setNote(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setNote("This browser can't do voice — use the chat instead.");
      return;
    }
    try {
      mic.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setNote("Allow the microphone to talk (in your browser's site settings), then try again.");
      return;
    }
    joined.current = true;
    setStatus("waiting");
    try {
      await step(await poolVoiceAction(token, code, { action: "join" }));
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't join voice");
    }
  }

  function toggleMute() {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  const on = status !== "off";
  if (compact) {
    // For the full-screen game's bar: one small button (and a hang-up while on)
    const title =
      status === "live"
        ? `Live with ${opponent}${muted ? " — you're muted" : ""}`
        : status === "connecting" || status === "failed"
          ? `Connecting to ${opponent}…`
          : status === "waiting"
            ? `On voice — waiting for ${opponent}`
            : themOn
              ? `${opponent} is on voice — join`
              : `Talk to ${opponent} live`;
    return (
      <div className="flex shrink-0 items-center gap-1">
        <audio ref={audio} autoPlay playsInline />
        <button
          type="button"
          onClick={on ? toggleMute : join}
          aria-label={on ? (muted ? "Unmute your microphone" : "Mute your microphone") : themOn ? "Join voice" : "Voice on"}
          title={note ?? title}
          className={`relative flex h-10 items-center gap-1 rounded-full border px-3 text-sm font-semibold transition ${
            status === "live"
              ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
              : on
                ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-100"
                : themOn
                  ? "animate-pulse border-accent bg-accent/20 text-white"
                  : "border-white/10 bg-white/[0.04] text-white"
          }`}
        >
          {on ? (muted ? "🔇" : "🎙") : "🎙"}
          <span className="hidden text-xs sm:inline">{status === "live" ? (muted ? "Muted" : "Live") : on ? "…" : themOn ? "Join" : "Voice"}</span>
          {!on && themOn && <span className="text-xs sm:hidden">Join</span>}
        </button>
        {on && (
          <button type="button" onClick={() => void leave()} aria-label="Leave voice" title="Leave voice" className="grid h-10 w-8 place-items-center rounded-full text-sm text-red-300 hover:bg-red-500/10">
            ✕
          </button>
        )}
      </div>
    );
  }
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm ${status === "live" ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"}`}>
      <audio ref={audio} autoPlay playsInline />
      <p className="min-w-0 flex-1 text-neutral-200">
        {status === "live" ? (
          <>
            <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            Live with <b className="text-white">{opponent}</b>
            {muted && " · you're muted"}
          </>
        ) : status === "connecting" ? (
          <>🎙 Connecting to {opponent}…</>
        ) : status === "waiting" ? (
          <>🎙 You&apos;re on voice — waiting for {opponent} to join</>
        ) : status === "failed" ? (
          <>🎙 Reconnecting…</>
        ) : themOn ? (
          <>
            🔊 <b className="text-white">{opponent}</b> is on voice
          </>
        ) : (
          <>🎙 Talk to {opponent} live while you play</>
        )}
        {note && <span className="mt-0.5 block text-xs text-yellow-200">{note}</span>}
      </p>
      {on ? (
        <>
          <button type="button" onClick={toggleMute} className="btn-outline min-h-[40px] px-3 text-xs">
            {muted ? "🔇 Unmute" : "Mute"}
          </button>
          <button type="button" onClick={() => void leave()} className="min-h-[40px] rounded-full px-3 text-xs font-semibold text-red-300 hover:bg-red-500/10">
            Leave
          </button>
        </>
      ) : (
        <button type="button" onClick={join} className="btn-accent min-h-[40px] px-4 text-xs">
          {themOn ? "Join voice" : "🎙 Voice on"}
        </button>
      )}
    </div>
  );
}
