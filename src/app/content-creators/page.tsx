"use client";

import { VideoContest } from "@/components/VideoContest";
import { site } from "@/config/site";

export default function ContentCreatorsPage() {
  return (
    <VideoContest
      config={{
        category: "creator",
        contest: true,
        pageEyebrow: "Contest",
        pageTitle: "Content Creators",
        pageSubtitle:
          "Shout-outs, reactions and promos from content creators — vote for the best. GH₵4,000 prize.",
        bannerEyebrow: "Content Creators · 2026",
        bannerTitle: "Best Content Creator & Promoter 2026",
        bannerBody: (
          <>
            Calling all content creators — make a video promoting Dark Music Yard. The{" "}
            <span className="font-semibold text-white">creator</span> whose video gets the{" "}
            <span className="font-semibold text-accent">most votes by 31 December 2026</span> wins a{" "}
            <span className="font-semibold text-accent">GH₵4,000 cash prize</span>. Fans, cast your{" "}
            <span className="font-semibold text-white">one vote</span> for the creator you rate the most.
          </>
        ),
        uploadCta: {
          title: "Are you a content creator?",
          blurb: "Sign in and upload your promo video to enter the contest",
          email: site.contact.email,
        },
        emptyLabel: "No entries yet",
      }}
    />
  );
}
