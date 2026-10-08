"use client";

import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { StarRating } from "./StarRating";
import { VoteButton } from "./VoteButton";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { Reveal } from "./Reveal";
import { UploadCta } from "./UploadCta";
import { useFanAuth, getFanToken } from "./FanAuthProvider";
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

export interface ContestConfig {
  category: "creator" | "fan" | "shorts";
  contest: boolean; // true = voting contest (banner + votes); false = plain showcase
  pageEyebrow: string;
  pageTitle: string;
  pageSubtitle: string;
  /** Header photo (or looping clip) — see PageHeader. */
  headerImage?: ComponentProps<typeof PageHeader>["image"];
  bannerEyebrow: string;
  bannerTitle: string;
  bannerBody?: ReactNode;
  /** If set, shows a "sign in & upload" call-to-action for entrants. */
  uploadCta?: { title: string; blurb: string; email?: string };
  emptyLabel: string;
}

/** A voting-contest leaderboard for one video category. */
export function VideoContest({ config }: { config: ContestConfig }) {
  const { user } = useFanAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return getVideos(config.category, getFanToken()).then(setVideos);
  }, [config.category]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load, user]);

  const [leader, ...rest] = videos;

  return (
    <>
      <PageHeader
        eyebrow={config.pageEyebrow}
        title={config.pageTitle}
        subtitle={config.pageSubtitle}
        image={config.headerImage}
      />

      <section className="container-page pb-20">
        {/* Contest banner (voting contests only) */}
        {config.contest && (
          <Reveal>
            <div className="relative mb-10 overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.12] to-ink-800/60 p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
              <p className="eyebrow">
                <span className="h-px w-6 bg-accent" /> {config.bannerEyebrow}
              </p>
              <h2 className="display-sm mt-3 text-white text-balance">{config.bannerTitle}</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-300">
                {config.bannerBody}
              </p>
            </div>
          </Reveal>
        )}

        {config.uploadCta && (
          <div className="mb-10">
            <UploadCta title={config.uploadCta.title} blurb={config.uploadCta.blurb} email={config.uploadCta.email} />
          </div>
        )}

        {loading ? (
          <div className="card p-10 text-center text-neutral-500">Loading the leaderboard…</div>
        ) : videos.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-semibold text-white">{config.emptyLabel}</p>
            <p className="mt-1 text-sm text-neutral-500">Entries will show up here soon.</p>
          </div>
        ) : (
          <>
            {/* #1 — current leader */}
            <Reveal>
              <div className="card grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-[1.5fr_1fr]">
                <div className="relative">
                  {config.contest && (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-glow-sm">
                      #1 · Leading 🏆
                    </span>
                  )}
                  <Player v={leader} />
                </div>
                <div>
                  <h3 className="display-sm text-white">{leader.title}</h3>
                  {leader.creator && <p className="mt-1 text-sm text-neutral-400">by {leader.creator}</p>}
                  {leader.description && (
                    <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">
                      {leader.description}
                    </p>
                  )}
                  {config.contest && (
                    <div className="mt-5">
                      <VoteButton
                        videoId={leader.id}
                        voteCount={leader.voteCount}
                        myVote={leader.myVote}
                        onChanged={load}
                      />
                    </div>
                  )}
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
                        {config.contest && (
                          <span className="absolute left-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-neutral-200 backdrop-blur">
                            #{i + 2}
                          </span>
                        )}
                        <Player v={v} rounded="rounded-none" />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="truncate font-semibold text-white">{v.title}</p>
                        {v.creator && <p className="text-xs text-neutral-500">by {v.creator}</p>}
                        {config.contest && (
                          <div className="mt-4">
                            <VoteButton
                              videoId={v.id}
                              voteCount={v.voteCount}
                              myVote={v.myVote}
                              onChanged={load}
                            />
                          </div>
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
