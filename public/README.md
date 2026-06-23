# Public assets — drop your real files here

The site renders with built-in placeholders. Replace these to brand it fully:

| File                | Used for                          | Notes                                  |
| ------------------- | --------------------------------- | -------------------------------------- |
| `logo.png`          | Brand logo / favicon              | Square PNG. Also update `Logo.tsx`.    |
| `artist-hero.jpg`   | Home hero background (gas-mask)    | ~1080×1350 portrait or wider.          |

Cover art for releases/beats and merch photos are uploaded through the **admin
dashboard** (`/admin`) and stored by the backend — they do not go here.

Streaming links, WhatsApp number, emails and the Ambition RMX YouTube video id
are set via `NEXT_PUBLIC_*` env vars in `frontend/.env.local` (see
`.env.local.example`). The YouTube video is configured per-release in `/admin`.
