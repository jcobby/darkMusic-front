"use client";

import { VideoContest } from "@/components/VideoContest";
import { site } from "@/config/site";
import { PHOTOS } from "@/config/media";

export default function FanVideosPage() {
  return (
    <VideoContest
      config={{
        category: "fan",
        contest: true,
        pageEyebrow: "Lenko Army Fan Zone",
        pageTitle: "Fan Videos",
        pageSubtitle:
          "Lenko Army🧠🖤 showing love for Lenko Psycho's music — watch, and vote for your favourite fan video for free.",
        headerImage: PHOTOS.setMonitorBw,
        bannerEyebrow: "Fan Videos · 2026",
        bannerTitle: "Best Fan Video 2026",
        bannerBody: (
          <>
            Make a video showing love for Lenko Psycho&apos;s music — sing along, dance, react or share what a song means to you. The{" "}
            <span className="font-semibold text-white">fan</span> whose video has the{" "}
            <span className="font-semibold text-accent">most votes by 31 December 2026</span> receives recognition from Dark Music Yard and a{" "}
            <span className="font-semibold text-accent">GH₵4,000 sponsored fan appreciation reward</span>.
          </>
        ),
        rules: [
          <>
            <b className="text-white">Dates:</b> open now; entries and voting close at 23:59 GMT on{" "}
            <b className="text-white">31 December 2026</b>.
          </>,
          <>
            <b className="text-white">Entries:</b> free. Your video must feature Lenko Psycho&apos;s music and be your own content. Sign in and upload
            it from your account — DMY reviews every video before it appears here.
          </>,
          <>
            <b className="text-white">Voting:</b> free for every signed-in fan — one vote per account, which you can move to another video any time
            before voting closes. There are no paid votes.
          </>,
          <>
            <b className="text-white">Winner:</b> the video with the most votes when voting closes. DMY announces the winner and contacts them to
            arrange the reward.
          </>,
          <>
            <b className="text-white">Reward:</b> recognition on Dark Music Yard and a GH₵4,000 fan appreciation reward, sponsored by Dark Music Yard
            from its own funds — it does not depend on any payment from participants.
          </>,
        ],
        uploadCta: {
          title: "Made a video to Lenko Psycho's music?",
          blurb: "Sign in and upload your fan video to enter",
          email: site.contact.email,
        },
        emptyLabel: "No fan videos yet",
      }}
    />
  );
}
