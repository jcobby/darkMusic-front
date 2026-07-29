"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StarRating } from "@/components/StarRating";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { Reveal } from "@/components/Reveal";
import { useFanAuth, getFanToken } from "@/components/FanAuthProvider";
import { getVideos, type VideoItem } from "@/lib/api";
import { youtubeId } from "@/lib/youtube";
import { videoPoster } from "@/lib/media";

/** Renders the right player for a video (YouTube embed or inline MP4). */
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

function RatingBadge({ avg, count }: { avg: number; count: number }) {
  if (!count) return <span className="text-xs text-neutral-500">Be the first to rate</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-accent">
      ★ {avg.toFixed(1)}
      <span className="text-neutral-500">({count})</span>
    </span>
  );
}

export default function BuzzPage() {
  const { user } = useFanAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVideos(getFanToken())
      .then(setVideos)
      .finally(() => setLoading(false));
  }, [user]);

  const [featured, ...rest] = videos;

  return (
    <>
      <PageHeader
        eyebrow="Watch"
        title="The Buzz"
        subtitle="Shout-outs, reactions and promos from content creators — the hype around Dark Music Yard. Sign in to rate your favourites ⭐"
      />

      <section className="container-page pb-20">
        {loading ? (
          <div className="card p-10 text-center text-neutral-500">Loading the buzz…</div>
        ) : videos.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-semibold text-white">No buzz yet</p>
            <p className="mt-1 text-sm text-neutral-500">Creator videos will show up here soon.</p>
          </div>
        ) : (
          <>
            {/* Featured video */}
            <Reveal>
              <div className="card grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-[1.5fr_1fr]">
                <Player v={featured} />
                <div>
                  <span className="eyebrow">
                    <span className="h-px w-6 bg-accent" /> Top of the buzz
                  </span>
                  <h2 className="display-sm mt-3 text-white">{featured.title}</h2>
                  {featured.creator && (
                    <p className="mt-1 text-sm text-neutral-400">by {featured.creator}</p>
                  )}
                  {featured.description && (
                    <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">
                      {featured.description}
                    </p>
                  )}
                  <div className="mt-5">
                    <StarRating
                      videoId={featured.id}
                      avg={featured.avgRating}
                      count={featured.ratingCount}
                      mine={featured.myStars}
                      size={26}
                    />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* The rest */}
            {rest.length > 0 && (
              <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {rest.map((v, i) => (
                  <Reveal key={v.id} delay={(i % 3) * 0.08}>
                    <div className="card-hover flex h-full flex-col overflow-hidden">
                      <Player v={v} rounded="rounded-none" />
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{v.title}</p>
                            {v.creator && (
                              <p className="text-xs text-neutral-500">by {v.creator}</p>
                            )}
                          </div>
                          <RatingBadge avg={v.avgRating} count={v.ratingCount} />
                        </div>
                        {v.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-neutral-400">
                            {v.description}
                          </p>
                        )}
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
