"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StarRating } from "@/components/StarRating";
import { VoteButton } from "@/components/VoteButton";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { Reveal } from "@/components/Reveal";
import { useFanAuth, getFanToken } from "@/components/FanAuthProvider";
import { getVideos, type VideoItem } from "@/lib/api";
import { youtubeId } from "@/lib/youtube";
import { videoPoster } from "@/lib/media";

function Player({ v, rounded = "rounded-2xl" }: { v: VideoItem; rounded?: string }) {
  if (youtubeId(v.videoUrl)) {
    return (
      <div className={`overflow-hidden ${rounded}`}>
        <YouTubeEmbed url={v.videoUrl} title={v.title} />
      </div>
    );
  }
  return (
    <video
      controls
      playsInline
      preload="metadata"
      poster={videoPoster(v.videoUrl, v.poster)}
      className={`aspect-video w-full bg-black object-contain ${rounded}`}
    >
      <source src={v.videoUrl} type="video/mp4" />
      Your browser can&apos;t play this video.
    </video>
  );
}

export default function BuzzPage() {
  const { user } = useFanAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return getVideos(getFanToken()).then(setVideos);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load, user]);

  const [leader, ...rest] = videos; // backend already ranks by votes

  return (
    <>
      <PageHeader
        eyebrow="Watch"
        title="The Buzz"
        subtitle="Shout-outs, reactions and promos from content creators — the hype around Dark Music Yard."
      />

      <section className="container-page pb-20">
        {/* Contest banner */}
        <Reveal>
          <div className="relative mb-10 overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.12] to-ink-800/60 p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
            <p className="eyebrow">
              <span className="h-px w-6 bg-accent" /> Contest · 2026
            </p>
            <h2 className="display-sm mt-3 text-white text-balance">
              Best Content Creator &amp; Promoter 2026
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-300">
              Vote for the video you think is the best. The creator whose video has the{" "}
              <span className="font-semibold text-accent">most votes by 31 December 2026</span> wins a{" "}
              <span className="font-semibold text-accent">cash prize</span>. You get{" "}
              <span className="font-semibold text-white">one vote</span> — you can move it anytime.
            </p>
          </div>
        </Reveal>

        {loading ? (
          <div className="card p-10 text-center text-neutral-500">Loading the leaderboard…</div>
        ) : videos.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-semibold text-white">No entries yet</p>
            <p className="mt-1 text-sm text-neutral-500">Creator videos will show up here soon.</p>
          </div>
        ) : (
          <>
            {/* #1 — current leader */}
            <Reveal>
              <div className="card grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-[1.5fr_1fr]">
                <div className="relative">
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-3 py-1 text-xs font-bold text-ink shadow-glow-sm">
                    #1 · Leading 🏆
                  </span>
                  <Player v={leader} />
                </div>
                <div>
                  <h3 className="display-sm text-white">{leader.title}</h3>
                  {leader.creator && (
                    <p className="mt-1 text-sm text-neutral-400">by {leader.creator}</p>
                  )}
                  {leader.description && (
                    <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">
                      {leader.description}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <VoteButton
                      videoId={leader.id}
                      voteCount={leader.voteCount}
                      myVote={leader.myVote}
                      onChanged={load}
                    />
                  </div>
                  <div className="mt-4">
                    <StarRating
                      videoId={leader.id}
                      avg={leader.avgRating}
                      count={leader.ratingCount}
                      mine={leader.myStars}
                      size={22}
                    />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* The rest of the leaderboard */}
            {rest.length > 0 && (
              <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {rest.map((v, i) => (
                  <Reveal key={v.id} delay={(i % 3) * 0.08}>
                    <div className="card-hover flex h-full flex-col overflow-hidden">
                      <div className="relative">
                        <span className="absolute left-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-neutral-200 backdrop-blur">
                          #{i + 2}
                        </span>
                        <Player v={v} rounded="rounded-none" />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="truncate font-semibold text-white">{v.title}</p>
                        {v.creator && <p className="text-xs text-neutral-500">by {v.creator}</p>}
                        <div className="mt-4">
                          <VoteButton
                            videoId={v.id}
                            voteCount={v.voteCount}
                            myVote={v.myVote}
                            onChanged={load}
                          />
                        </div>
                        <div className="mt-4 border-t border-white/[0.06] pt-4">
                          <StarRating
                            videoId={v.id}
                            avg={v.avgRating}
                            count={v.ratingCount}
                            mine={v.myStars}
                            size={18}
                          />
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
