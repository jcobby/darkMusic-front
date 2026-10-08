"use client";

import { VideoContest } from "@/components/VideoContest";
import { VIDEOS } from "@/config/media";

export default function ShortsPage() {
  return (
    <VideoContest
      config={{
        category: "shorts",
        contest: false,
        pageEyebrow: "Watch",
        pageTitle: "Shorts",
        pageSubtitle: "Quick clips and behind-the-scenes from Dark Music Yard. Sign in to rate them ⭐",
        // A short in the header of the Shorts page — Lenko on the car-park shoot.
        headerImage: {
          src: VIDEOS.lenkoOnSet.poster,
          video: VIDEOS.lenkoOnSet.src,
          alt: VIDEOS.lenkoOnSet.alt,
          position: "50% 40%",
        },
        bannerEyebrow: "",
        bannerTitle: "",
        emptyLabel: "No shorts yet",
      }}
    />
  );
}
