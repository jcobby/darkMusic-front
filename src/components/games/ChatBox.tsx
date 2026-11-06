"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { getChat, sendChat, type ChatMsg } from "@/lib/api";
import { adminDelete, getToken as getAdminToken } from "@/lib/adminApi";
import { getFanToken, useFanAuth } from "../FanAuthProvider";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * Chat for a game challenge: a Pool match (room "pool-<code>", the two players) or a live
 * event (room "event-<slug>", everyone). Checks for new messages every few seconds while
 * the page is open. An admin signed in on this browser can hide event messages.
 */
export function ChatBox({
  room,
  title = "💬 Chat",
  quick = [],
  pollMs = 3000,
  muteable = false,
  className = "",
  closedText = "The chat isn't open right now.",
  onIncoming,
  id,
}: {
  room: string;
  title?: string;
  quick?: string[];
  pollMs?: number;
  muteable?: boolean; // the other player can be muted (Pool)
  className?: string;
  closedText?: string;
  onIncoming?: (m: ChatMsg) => void; // a new message from someone else (not the ones already there on opening)
  id?: string;
}) {
  const { user } = useFanAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isMuted, setMuted] = useState(false);
  const muted = useRef(false);
  muted.current = isMuted;
  const [isAdmin, setIsAdmin] = useState(false);
  const list = useRef<HTMLDivElement | null>(null);
  const last = useRef<string | undefined>(undefined);
  const loaded = useRef(false); // the first look is history, not news
  const incoming = useRef(onIncoming);
  incoming.current = onIncoming;

  useEffect(() => setIsAdmin(room.startsWith("event-") && Boolean(getAdminToken())), [room]);

  const add = useCallback((more: ChatMsg[]) => {
    if (!more.length) return;
    setMessages((cur) => {
      const seen = new Set(cur.map((m) => m.id));
      const next = [...cur, ...more.filter((m) => !seen.has(m.id))].slice(-120);
      last.current = next[next.length - 1]?.at ?? last.current;
      return next;
    });
  }, []);

  useEffect(() => {
    let live = true;
    last.current = undefined;
    loaded.current = false;
    setMessages([]);
    const load = () =>
      getChat(room, getFanToken(), last.current)
        .then((r) => {
          if (!live) return;
          setCanWrite(r.canWrite);
          if (loaded.current && !muted.current) r.messages.filter((m) => !m.mine).forEach((m) => incoming.current?.(m));
          loaded.current = true;
          add(r.messages);
          setError(null);
        })
        .catch((err) => live && setError(err instanceof Error ? err.message : "Can't reach the chat"));
    void load();
    const id = setInterval(() => !document.hidden && void load(), pollMs);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [room, pollMs, add, user?.id]);

  // Keep the newest message in view (unless they've scrolled up to read)
  useEffect(() => {
    const el = list.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 80) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(value: string) {
    const token = getFanToken();
    const body = value.trim();
    if (!token || !body || sending) return;
    setSending(true);
    setError(null);
    try {
      add([await sendChat(token, room, body)]);
      setText("");
      requestAnimationFrame(() => list.current && (list.current.scrollTop = list.current.scrollHeight));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that");
    } finally {
      setSending(false);
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };
  async function hide(id: string) {
    try {
      await adminDelete(`/chat/${id}`);
      setMessages((cur) => cur.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't hide it");
    }
  }

  const shown = isMuted ? messages.filter((m) => m.mine) : messages;
  return (
    <div id={id} className={`card overflow-hidden scroll-mt-24 ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-sm font-semibold text-white">{title}</p>
        {muteable && (
          <button type="button" onClick={() => setMuted((m) => !m)} className="text-xs text-neutral-400 hover:text-white">
            {isMuted ? "🔕 Muted — show messages" : "Mute"}
          </button>
        )}
      </div>
      <div ref={list} className="max-h-56 min-h-[4.5rem] space-y-1.5 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
        {shown.length === 0 ? (
          <p className="text-xs text-neutral-500">{isMuted ? "Their messages are hidden." : "No messages yet — say hi 👋"}</p>
        ) : (
          shown.map((m) => (
            <p key={m.id} className="group break-words">
              <span className="mr-1.5 text-[10px] tabular-nums text-neutral-500">{time(m.at)}</span>
              <b className={m.mine ? "text-accent" : "text-white"}>{m.mine ? "You" : m.name}</b> <span className="text-neutral-200">{m.text}</span>
              {isAdmin && (
                <button type="button" onClick={() => hide(m.id)} className="ml-2 text-[10px] text-red-300 hover:underline" aria-label="Hide this message">
                  hide
                </button>
              )}
            </p>
          ))
        )}
      </div>
      <div className="border-t border-white/[0.06] p-3">
        {!user ? (
          <p className="text-xs text-neutral-400">
            <Link href="/account" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>{" "}
            to chat.
          </p>
        ) : !canWrite ? (
          <p className="text-xs text-neutral-500">{closedText}</p>
        ) : (
          <>
            {quick.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {quick.map((q) => (
                  <button key={q} type="button" disabled={sending} onClick={() => send(q)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm hover:border-accent">
                    {q}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={submit} className="flex gap-2">
              <input className="input min-w-0 flex-1 text-base" placeholder="Message…" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" />
              <button type="submit" disabled={sending || !text.trim()} className="btn-accent min-h-[44px] shrink-0 px-4 text-sm">
                Send
              </button>
            </form>
          </>
        )}
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </div>
    </div>
  );
}
