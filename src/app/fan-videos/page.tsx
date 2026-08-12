"use client";

import { VideoContest } from "@/components/VideoContest";
import { site } from "@/config/site";

export default function FanVideosPage() {
  return (
    <VideoContest
      config={{
        category: "fan",
        contest: true,
        pageEyebrow: "Contest",
        pageTitle: "Fan Videos",
        pageSubtitle:
          "Fans showing love for Dark Music Yard — vote for the best fan video. GH₵4,000 prize.",
        bannerEyebrow: "Fan Videos · 2026",
        bannerTitle: "Best Fan Video 2026",
        bannerBody: (
          <>
            Make a video showing love for Dark Music Yard. The{" "}
            <span className="font-semibold text-white">fan</span> whose video gets the{" "}
            <span className="font-semibold text-accent">most votes by 31 December 2026</span> wins a{" "}
            <span className="font-semibold text-accent">GH₵4,000 cash prize</span>. You get{" "}
            <span className="font-semibold text-white">one vote</span> — move it anytime before then.
          </>
        ),
        uploadCta: {
          title: "Made a video for DMY?",
          blurb: "Sign in and upload your fan video to enter",
          email: site.contact.email,
        },
        emptyLabel: "No fan videos yet",
      }}
    />
  );
}
