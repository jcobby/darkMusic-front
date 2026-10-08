# Public assets — drop your real files here

| Path                    | Used for                                             | Notes                                             |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| `logo.png`              | Brand logo / favicon                                 | Square PNG. Also update `Logo.tsx`.               |
| `artist-poster.jpg`     | "The Artist" poster (home + About)                   | 900px JPG of the original `artist-poster.png`.    |
| `photos/*.jpg`          | Page-header photos, home + About sections            | Listed with alt text in `src/config/media.ts`.    |
| `video/hero.mp4`        | Home hero background (muted loop)                    | H.264 MP4, no audio, `-movflags +faststart`.      |
| `video/hero-poster.jpg` | Frame shown while the hero video loads               |                                                   |
| `video/lenko-on-set.*`  | Vertical clip on About + the Shorts header           | H.264 MP4 with audio; `.jpg` is its poster frame. |

To add or swap a photo, drop it in `photos/`, add it to `PHOTOS` in
`src/config/media.ts` (with alt text and a focal point), then pass it to a
page's `<PageHeader image={…} />`. Use H.264 MP4 for video — iPhone HEVC files
don't play in every browser.

Cover art for releases/beats and merch photos are uploaded through the **admin
dashboard** (`/admin`) and stored by the backend — they do not go here.

Streaming links, WhatsApp number, emails and the Ambition RMX YouTube video id
are set via `NEXT_PUBLIC_*` env vars in `frontend/.env.local` (see
`.env.local.example`). The YouTube video is configured per-release in `/admin`.
