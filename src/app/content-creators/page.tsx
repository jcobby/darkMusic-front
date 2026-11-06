"use client";

import { VideoContest } from "@/components/VideoContest";
import { site } from "@/config/site";
import { PHOTOS } from "@/config/media";

export default function ContentCreatorsPage() {
  return (
    <VideoContest
      config={{
        category: "creator",
        contest: true,
        pageEyebrow: "Music promotion campaign",
        pageTitle: "Creator Spotlight",
        pageSubtitle:
          "Creators using Lenko Psycho's songs in their videos — watch, and vote for your favourite for free.",
        headerImage: PHOTOS.setCameraCrew,
        bannerEyebrow: "Dark Music Yard Creator Spotlight · 2026",
        bannerTitle: "Dark Music Yard Creator Spotlight",
        bannerBody: (
          <>
            A music promotion campaign for content creators: make a video using{" "}
            <span className="font-semibold text-white">Lenko Psycho&apos;s songs</span> and help more people discover the music. Fans vote
            for their favourite music-related video for free, and the creator whose video has the{" "}
            <span className="font-semibold text-accent">most votes by 31 December 2026</span> receives recognition from Dark Music Yard
            and a <span className="font-semibold text-accent">GH₵4,000 sponsored promotional reward</span>.
          </>
        ),
        rules: [
          <>
            <b className="text-white">Dates:</b> open now; entries and voting close at 23:59 GMT on{" "}
            <b className="text-white">31 December 2026</b>.
          </>,
          <>
            <b className="text-white">Entries:</b> free. Your video must use Lenko Psycho&apos;s music and be your own content. Sign in and upload
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
            <b className="text-white">Reward:</b> recognition on Dark Music Yard and a GH₵4,000 promotional reward, sponsored by Dark Music Yard from
            its own funds — it does not depend on any payment from participants.
          </>,
        ],
        uploadCta: {
          title: "Are you a content creator?",
          blurb: "Sign in and upload a video that uses Lenko Psycho's music to enter",
          email: site.contact.email,
        },
        emptyLabel: "No entries yet",
      }}
    />
  );
}
