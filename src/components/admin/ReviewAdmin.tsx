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
  bio?: string;
  photos: string[];
  video?: string;
  legalName?: string;
  phone?: string;
  email?: string;
  location?: string;
  age?: number;
  height?: string;
  weight?: string;
  experience?: string;
  categories?: string[];
  languages?: string[];
  rateGhs?: number;
  availability?: string;
  instagram?: string;
  tiktok?: string;
  termsAcceptedAt?: string;
  submittedBy?: Submitter;
  createdAt: string;
}

/** Everything a model registered with, for the approval decision. */
function ModelFacts({ m }: { m: PendingModel }) {
  const rows: [string, string | undefined][] = [
    ["Legal name", m.legalName],
    ["Age", m.age !== undefined ? String(m.age) : undefined],
    ["Phone", m.phone],
    ["Email", m.email],
    ["Location", m.location],
    ["Height", m.height],
    ["Weight", m.weight],
    ["Starting rate", m.rateGhs !== undefined ? `GH₵${m.rateGhs.toLocaleString("en-US")}` : undefined],
    ["Shoot types", m.categories?.join(", ")],
    ["Languages", m.languages?.join(", ")],
    ["Availability", m.availability],
    ["Instagram", m.instagram && `@${m.instagram}`],
    ["TikTok", m.tiktok && `@${m.tiktok}`],
    ["Experience", m.experience],
    ["Declarations", m.termsAcceptedAt ? `All ticked ${new Date(m.termsAcceptedAt).toLocaleDateString()}` : undefined],
  ];
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
      {rows
        .filter((r): r is [string, string] => Boolean(r[1]))
        .map(([label, value]) => (
          <div key={label} className={label === "Experience" ? "col-span-2" : ""}>
            <dt className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</dt>
            <dd className="text-neutral-200">{value}</dd>
          </div>
        ))}
    </dl>
  );
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
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-white transition hover:bg-accent-soft disabled:opacity-50"
      >
        Approve · publish
      </button>
      <button
        onClick={onReject}
        disabled={busy}
        className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-neutral-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
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
                {m.video && (
                  <video src={m.video} controls preload="metadata" className="mt-1 max-h-56 w-full rounded-lg bg-black" />
                )}
                <p className="mt-2 font-semibold text-white">{m.name}</p>
                <By who={m.submittedBy} />
                {m.bio && <p className="mt-2 text-sm text-neutral-400">{m.bio}</p>}
                <ModelFacts m={m} />
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
