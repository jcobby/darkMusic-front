"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet, adminPatch } from "@/lib/adminApi";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { youtubeId } from "@/lib/youtube";

interface Submitter {
  email?: string;
  name?: string;
}
interface PendingVideo {
  _id: string;
  title: string;
  category: string;
  description?: string;
  videoUrl: string;
  poster?: string;
  submittedBy?: Submitter;
  createdAt: string;
}
interface PendingModel {
  _id: string;
  name: string;
  rateGhs: number;
  bio?: string;
  photos: string[];
  submittedBy?: Submitter;
  createdAt: string;
}

function By({ who }: { who?: Submitter }) {
  if (!who) return null;
  return (
    <p className="text-xs text-neutral-500">
      by {who.name || "—"} ({who.email})
    </p>
  );
}

function Actions({
  onApprove,
  onReject,
  busy,
}: {
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={onApprove}
        disabled={busy}
        className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-ink transition hover:bg-emerald-400 disabled:opacity-50"
      >
        Approve · publish
      </button>
      <button
        onClick={onReject}
        disabled={busy}
        className="rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}

export function ReviewAdmin() {
  const [videos, setVideos] = useState<PendingVideo[]>([]);
  const [models, setModels] = useState<PendingModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<{ videos: PendingVideo[]; models: PendingModel[] }>(
        "/submissions"
      );
      setVideos(data.videos);
      setModels(data.models);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(type: "video" | "model", id: string, status: "approved" | "rejected") {
    setBusyId(id);
    try {
      await adminPatch(`/submissions/${type}/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  const empty = videos.length === 0 && models.length === 0;
  if (empty) {
    return (
      <p className="card p-8 text-center text-sm text-neutral-500">
        Nothing awaiting review. Submissions from fans, creators and models show up here.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {videos.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Videos · {videos.length}
          </h3>
          <div className="grid gap-5 md:grid-cols-2">
            {videos.map((v) => (
              <div key={v._id} className="card overflow-hidden">
                <div className="aspect-video w-full bg-black">
                  {youtubeId(v.videoUrl) ? (
                    <YouTubeEmbed url={v.videoUrl} title={v.title} />
                  ) : (
                    <video
                      controls
                      preload="metadata"
                      poster={v.poster}
                      className="h-full w-full object-contain"
                    >
                      <source src={v.videoUrl} />
                    </video>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-ink-600 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                      {v.category}
                    </span>
                    <p className="truncate font-semibold text-white">{v.title}</p>
                  </div>
                  <By who={v.submittedBy} />
                  {v.description && (
                    <p className="mt-2 text-sm text-neutral-400">{v.description}</p>
                  )}
                  <Actions
                    busy={busyId === v._id}
                    onApprove={() => review("video", v._id, "approved")}
                    onReject={() => review("video", v._id, "rejected")}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {models.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Model profiles · {models.length}
          </h3>
          <div className="grid gap-5 md:grid-cols-2">
            {models.map((m) => (
              <div key={m._id} className="card p-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {m.photos.map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={p}
                      alt=""
                      className="h-28 w-20 shrink-0 rounded-lg object-cover"
                    />
                  ))}
                </div>
                <p className="mt-2 font-semibold text-white">
                  {m.name}{" "}
                  <span className="text-sm font-normal text-accent">
                    GH₵{m.rateGhs?.toLocaleString()}
                  </span>
                </p>
                <By who={m.submittedBy} />
                {m.bio && <p className="mt-2 text-sm text-neutral-400">{m.bio}</p>}
                <Actions
                  busy={busyId === m._id}
                  onApprove={() => review("model", m._id, "approved")}
                  onReject={() => review("model", m._id, "rejected")}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
