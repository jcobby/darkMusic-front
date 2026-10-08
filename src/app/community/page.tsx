"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PHOTOS } from "@/config/media";
import { useFanAuth, getFanToken } from "@/components/FanAuthProvider";
import {
  getWall,
  createWallPost,
  likeWallPost,
  deleteWallPost,
  type WallPost,
} from "@/lib/api";

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

export default function CommunityPage() {
  const { user } = useFanAuth();
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getWall(getFanToken())
      .then(setPosts)
      .finally(() => setLoading(false));
  }, [user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token || (!body.trim() && !photo)) return;
    setError(null);
    setPosting(true);
    try {
      const post = await createWallPost(token, { body: body.trim(), photo });
      setPosts((p) => [post, ...p]);
      setBody("");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    const token = getFanToken();
    if (!token) return;
    if (!confirm("Delete this post? This can't be undone.")) return;
    const prev = posts;
    setPosts((list) => list.filter((p) => p.id !== id)); // optimistic
    try {
      await deleteWallPost(token, id);
    } catch {
      setPosts(prev); // restore on failure
    }
  }

  async function like(id: string) {
    const token = getFanToken();
    if (!token) return;
    // Optimistic
    setPosts((list) =>
      list.map((p) =>
        p.id === id
          ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) }
          : p
      )
    );
    try {
      const { likes, likedByMe } = await likeWallPost(token, id);
      setPosts((list) => list.map((p) => (p.id === id ? { ...p, likes, likedByMe } : p)));
    } catch {
      /* leave optimistic state; next load reconciles */
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="The Fan Wall"
        subtitle="Shout-outs, merch photos and reactions from the DMY family. Sign in to post."
        image={PHOTOS.couchCrewBw}
      />

      <section className="container-page py-14">
        <div className="mx-auto max-w-2xl">
          {/* Composer */}
          {user ? (
            <form onSubmit={submit} className="card mb-8 p-5">
              <textarea
                className="input min-h-[84px] resize-y"
                placeholder="Share something with the yard…"
                maxLength={500}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="cursor-pointer text-sm text-neutral-400 hover:text-accent">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  />
                  {photo ? `📷 ${photo.name.slice(0, 24)}` : "📷 Add photo"}
                </label>
                <button
                  type="submit"
                  disabled={posting || (!body.trim() && !photo)}
                  className="btn-accent"
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            </form>
          ) : (
            <div className="card mb-8 p-5 text-center text-sm text-neutral-400">
              <Link href="/account" className="font-semibold text-accent hover:underline">
                Sign in
              </Link>{" "}
              to post on the wall and react to others.
            </div>
          )}

          {/* Feed */}
          {loading ? (
            <div className="card p-8 text-center text-neutral-500">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="card p-8 text-center text-neutral-500">
              Nothing here yet — be the first to post!
            </div>
          ) : (
            <ul className="space-y-4">
              {posts.map((p) => (
                <li key={p.id} className="card p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-white">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      <p className="text-[11px] text-neutral-500">{timeAgo(p.createdAt)}</p>
                    </div>
                  </div>

                  {p.body && (
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-200">
                      {p.body}
                    </p>
                  )}
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt=""
                      loading="lazy"
                      className="mt-3 max-h-96 w-full rounded-xl object-cover"
                    />
                  )}

                  <div className="mt-4 flex items-center gap-4">
                    {user ? (
                      <button
                        onClick={() => like(p.id)}
                        className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
                          p.likedByMe ? "text-accent" : "text-neutral-400 hover:text-accent"
                        }`}
                      >
                        <Heart filled={p.likedByMe} />
                        {p.likes > 0 ? p.likes : "Like"}
                      </button>
                    ) : (
                      <Link
                        href="/account"
                        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-accent"
                      >
                        <Heart filled={false} />
                        {p.likes > 0 ? p.likes : "Like"}
                      </Link>
                    )}
                    {p.mine && (
                      <button
                        onClick={() => remove(p.id)}
                        className="text-sm text-neutral-500 transition-colors hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
