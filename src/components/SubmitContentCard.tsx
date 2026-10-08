"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useFanAuth, getFanToken } from "./FanAuthProvider";
import { ModelRegistrationForm } from "./ModelRegistrationForm";
import {
  submitVideoContent,
  getMySubmissions,
  resendVerification,
  type MySubmissions,
} from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  approved: "bg-accent text-white",
  rejected: "bg-red-500/15 text-red-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
        STATUS_STYLE[status] || "bg-white/10 text-neutral-300"
      }`}
    >
      {status === "approved" ? "Live ✓" : status}
    </span>
  );
}

const fileInputClass =
  "block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-600 file:px-3 file:py-2 file:text-sm file:text-neutral-100";

/** Lets a verified user upload a video (fan or creator contest) or register as
 *  a model — all routed to the admin review queue. */
export function SubmitContentCard({ onModelSubmitted }: { onModelSubmitted?: () => void }) {
  const { user } = useFanAuth();
  const [kind, setKind] = useState<"video" | "model">("video");
  const [subs, setSubs] = useState<MySubmissions>({ videos: [], models: [] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  // Video form
  const [v, setV] = useState({ title: "", description: "" });
  const [videoCategory, setVideoCategory] = useState<"fan" | "creator">("fan");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [poster, setPoster] = useState<File | null>(null);

  const load = useCallback(() => {
    const token = getFanToken();
    if (token) getMySubmissions(token).then(setSubs);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  // Gate uploads behind a confirmed email address.
  if (!user.emailVerified) {
    async function resend() {
      const token = getFanToken();
      if (!token) return;
      setResendMsg(null);
      try {
        const { message } = await resendVerification(token);
        setResendMsg(message);
      } catch (err) {
        setResendMsg(err instanceof Error ? err.message : "Could not resend");
      }
    }
    return (
      <div className="card p-6">
        <p className="font-semibold text-white">Share your content</p>
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Confirm your email first. We sent a link to{" "}
          <span className="font-semibold">{user.email}</span> — click it, then reload this page to
          upload your videos or model profile.
        </div>
        <button onClick={resend} className="btn-outline mt-3">
          Resend confirmation email
        </button>
        {resendMsg && <p className="mt-2 text-sm text-neutral-200">{resendMsg}</p>}
      </div>
    );
  }

  async function onSubmitVideo(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token) return;
    if (!videoFile) {
      setError("Choose a video file to upload");
      return;
    }
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await submitVideoContent(token, {
        title: v.title,
        category: videoCategory,
        description: v.description,
        videoFile,
        poster,
      });
      setMsg("✓ Submitted! It'll go live once an admin approves it.");
      setV({ title: "", description: "" });
      setVideoFile(null);
      setPoster(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  // One model profile per account — once one is pending or live, show its status instead.
  const activeModel = subs.models.find((s) => s.status === "pending" || s.status === "approved");

  return (
    <div className="card p-6">
      <p className="font-semibold text-white">Share your content</p>
      <p className="mt-1 text-sm text-neutral-400">
        Upload a video or list yourself as a model. An admin reviews it before it appears on the
        site.
      </p>

      {/* Type switch */}
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-ink-800/80 p-1">
        {(
          [
            ["video", "Submit a video"],
            ["model", "Model profile"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              setMsg(null);
              setError(null);
            }}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
              kind === k ? "bg-accent text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === "video" ? (
        <form onSubmit={onSubmitVideo} className="mt-4 space-y-3">
          <div>
            <label className="label">Which contest?</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["fan", "Fan video"],
                  ["creator", "Content creator"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setVideoCategory(val)}
                  className={`rounded-xl border py-2 text-sm font-semibold transition ${
                    videoCategory === val
                      ? "border-accent bg-accent/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/25"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <input
            className="input"
            placeholder="Video title *"
            required
            value={v.title}
            onChange={(e) => setV((s) => ({ ...s, title: e.target.value }))}
          />
          <textarea
            className="input min-h-[70px]"
            placeholder="Description (optional)"
            value={v.description}
            onChange={(e) => setV((s) => ({ ...s, description: e.target.value }))}
          />
          <div>
            <label className="label">Video file (MP4/MOV, up to 100MB) *</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className={fileInputClass}
            />
          </div>
          <div>
            <label className="label">Thumbnail (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPoster(e.target.files?.[0] || null)}
              className={fileInputClass}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {msg && <p className="text-sm font-semibold text-white">{msg}</p>}
          <button type="submit" disabled={busy} className="btn-accent w-full justify-center">
            {busy ? "Uploading…" : "Submit for review"}
          </button>
        </form>
      ) : activeModel ? (
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-neutral-300">
          {msg && <p className="mb-2 font-semibold text-white">{msg}</p>}
          {activeModel.status === "pending"
            ? `Your model profile "${activeModel.name}" is waiting for DMY to review it. We'll email you once it's live.`
            : `"${activeModel.name}" is live — manage your bookings and rate in your model dashboard on this page.`}
        </div>
      ) : (
        <ModelRegistrationForm
          defaults={{ name: user.name ?? "", phone: user.phone ?? "", email: user.email }}
          onSubmitted={() => {
            setMsg("✓ Submitted! DMY will review your profile and email you once it's live.");
            load();
            onModelSubmitted?.();
          }}
        />
      )}

      {/* Submission history */}
      {(subs.videos.length > 0 || subs.models.length > 0) && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Your submissions</p>
          <ul className="space-y-2">
            {subs.videos.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-neutral-200">🎬 {s.title}</span>
                <StatusBadge status={s.status} />
              </li>
            ))}
            {subs.models.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-neutral-200">📸 {s.name}</span>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
