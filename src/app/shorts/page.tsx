"use client";

import { VideoContest } from "@/components/VideoContest";

export default function ShortsPage() {
  return (
    <VideoContest
      config={{
        category: "shorts",
        contest: false,
        pageEyebrow: "Watch",
        pageTitle: "Shorts",
        pageSubtitle: "Quick clips and behind-the-scenes from Dark Music Yard. Sign in to rate them ⭐",
        bannerEyebrow: "",
        bannerTitle: "",
        emptyLabel: "No shorts yet",
      }}
    />
  );
}
