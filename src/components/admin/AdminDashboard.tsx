"use client";

import { useState } from "react";
import { CatalogAdmin, type ResourceConfig } from "./CatalogAdmin";
import { InboxAdmin } from "./InboxAdmin";
import { ReviewAdmin } from "./ReviewAdmin";
import { VisitStats } from "./VisitStats";

const RELEASES: ResourceConfig = {
  key: "releases",
  label: "Releases",
  endpoint: "/releases",
  primary: "title",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "spotifyUrl", label: "Spotify URL", type: "url" },
    { name: "appleUrl", label: "Apple Music URL", type: "url" },
    { name: "youtubeUrl", label: "YouTube URL", type: "url" },
    { name: "priceGhs", label: "MP3 price (GH₵)", type: "number", default: "10" },
    { name: "order", label: "Sort order", type: "number", default: "0" },
    { name: "downloadable", label: "Downloadable (sell MP3)", type: "checkbox" },
    { name: "isFeatured", label: "Featured on home", type: "checkbox" },
    { name: "isWelcome", label: "Welcome song (auto-plays on first visit)", type: "checkbox" },
    { name: "hidden", label: "Hidden — don't show on the site", type: "checkbox" },
    { name: "cover", label: "Cover image", type: "file", accept: "image/*" },
    { name: "audio", label: "MP3 file (delivered after purchase)", type: "file", accept: "audio/*" },
  ],
};

const BEATS: ResourceConfig = {
  key: "beats",
  label: "Beats",
  endpoint: "/beats",
  primary: "title",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "genre", label: "Genre", type: "text" },
    { name: "wavPriceGhs", label: "WAV price (GH₵)", type: "number", default: "100" },
    { name: "order", label: "Sort order", type: "number", default: "0" },
    { name: "isFeatured", label: "Featured on home", type: "checkbox" },
    { name: "isWelcome", label: "Welcome track (auto-plays on first visit)", type: "checkbox" },
    { name: "hidden", label: "Hidden — don't show on the site", type: "checkbox" },
    { name: "cover", label: "Cover image", type: "file", accept: "image/*" },
    { name: "mp3Free", label: "Free MP3 file", type: "file", accept: "audio/*" },
    { name: "wav", label: "WAV file (paid)", type: "file", accept: "audio/*,.wav" },
  ],
};

const MERCH: ResourceConfig = {
  key: "merch",
  label: "Merch",
  endpoint: "/merch",
  primary: "name",
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "category",
      label: "Category",
      type: "select",
      options: [
        "tshirt",
        "jersey",
        "hoodie",
        "cap",
        "socks",
        "wristband",
        "bandana",
        "book",
        "pen",
        "poster",
        "signed",
        "limited",
      ],
      default: "tshirt",
    },
    { name: "priceGhs", label: "Price (GH₵)", type: "number", default: "0" },
    { name: "stock", label: "Stock", type: "number", default: "0" },
    { name: "sizes", label: "Sizes (comma separated)", type: "text", placeholder: "S, M, L, XL" },
    { name: "isLimited", label: "Limited edition", type: "checkbox" },
    { name: "isSigned", label: "Signed", type: "checkbox" },
    { name: "isFeatured", label: "Featured on home", type: "checkbox" },
    { name: "hidden", label: "Hidden — don't show on the site", type: "checkbox" },
    { name: "images", label: "Images", type: "file", accept: "image/*", multiple: true },
  ],
};

const VIDEOS: ResourceConfig = {
  key: "videos",
  label: "Contest Videos",
  endpoint: "/videos",
  primary: "title",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "category",
      label: "Section (creator/fan = contest · shorts = your own)",
      type: "select",
      options: ["creator", "fan", "shorts"],
      default: "creator",
    },
    { name: "creator", label: "Creator / fan name", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "videoUrl",
      label: "Video URL (YouTube link or direct MP4) — or upload a file below",
      type: "url",
    },
    {
      name: "videoFile",
      label: "OR upload a video file (MP4/MOV, up to 100MB)",
      type: "file",
      accept: "video/*",
    },
    { name: "order", label: "Sort order", type: "number", default: "0" },
    { name: "hidden", label: "Hidden — don't show on the site", type: "checkbox" },
    { name: "poster", label: "Thumbnail image (optional)", type: "file", accept: "image/*" },
  ],
};

const MODELS: ResourceConfig = {
  key: "models",
  label: "Models",
  endpoint: "/models",
  primary: "name",
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "rateGhs", label: "Rate (GH₵ — between 2000 and 5000)", type: "number", default: "2000" },
    { name: "bio", label: "Short bio / description", type: "textarea" },
    { name: "order", label: "Sort order", type: "number", default: "0" },
    { name: "isFeatured", label: "Featured on home", type: "checkbox" },
    { name: "hidden", label: "Hidden — don't show on the site", type: "checkbox" },
    {
      name: "photos",
      label: "Photos (add one or more — first is the main shot)",
      type: "file",
      accept: "image/*",
      multiple: true,
    },
  ],
};

const TABS = [
  { key: "review", label: "★ Review" },
  { key: "releases", label: "Releases" },
  { key: "beats", label: "Beats" },
  { key: "merch", label: "Merch" },
  { key: "videos", label: "Contest Videos" },
  { key: "models", label: "Models" },
  { key: "bookings", label: "Bookings" },
  { key: "inquiries", label: "Inquiries" },
  { key: "orders", label: "Orders" },
  { key: "donations", label: "Donations" },
] as const;

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("releases");

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-400">Manage your catalog, inquiries and orders.</p>
        </div>
        <button onClick={onLogout} className="btn-outline">
          Log out
        </button>
      </div>

      <VisitStats />

      <div className="mb-8 flex flex-wrap gap-2 border-b border-ink-600 pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-accent text-ink" : "text-neutral-300 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "review" && <ReviewAdmin />}
      {tab === "releases" && <CatalogAdmin config={RELEASES} />}
      {tab === "beats" && <CatalogAdmin config={BEATS} />}
      {tab === "merch" && <CatalogAdmin config={MERCH} />}
      {tab === "videos" && <CatalogAdmin config={VIDEOS} />}
      {tab === "models" && <CatalogAdmin config={MODELS} />}
      {tab === "bookings" && <InboxAdmin kind="bookings" />}
      {tab === "inquiries" && <InboxAdmin kind="inquiries" />}
      {tab === "orders" && <InboxAdmin kind="orders" />}
      {tab === "donations" && <InboxAdmin kind="donations" />}
    </div>
  );
}
