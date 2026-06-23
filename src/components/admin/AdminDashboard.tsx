"use client";

import { useState } from "react";
import { CatalogAdmin, type ResourceConfig } from "./CatalogAdmin";
import { InboxAdmin } from "./InboxAdmin";

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
      options: ["tshirt", "hoodie", "cap", "poster", "signed", "limited"],
      default: "tshirt",
    },
    { name: "priceGhs", label: "Price (GH₵)", type: "number", default: "0" },
    { name: "stock", label: "Stock", type: "number", default: "0" },
    { name: "sizes", label: "Sizes (comma separated)", type: "text", placeholder: "S, M, L, XL" },
    { name: "isLimited", label: "Limited edition", type: "checkbox" },
    { name: "isSigned", label: "Signed", type: "checkbox" },
    { name: "isFeatured", label: "Featured on home", type: "checkbox" },
    { name: "images", label: "Images", type: "file", accept: "image/*", multiple: true },
  ],
};

const TABS = [
  { key: "releases", label: "Releases" },
  { key: "beats", label: "Beats" },
  { key: "merch", label: "Merch" },
  { key: "inquiries", label: "Inquiries" },
  { key: "orders", label: "Orders" },
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

      {tab === "releases" && <CatalogAdmin config={RELEASES} />}
      {tab === "beats" && <CatalogAdmin config={BEATS} />}
      {tab === "merch" && <CatalogAdmin config={MERCH} />}
      {tab === "inquiries" && <InboxAdmin kind="inquiries" />}
      {tab === "orders" && <InboxAdmin kind="orders" />}
    </div>
  );
}
