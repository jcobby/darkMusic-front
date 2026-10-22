"use client";

import { useEffect, useState } from "react";
import { CatalogAdmin, type ResourceConfig } from "./CatalogAdmin";
import { InboxAdmin } from "./InboxAdmin";
import { BookingsAdmin } from "./BookingsAdmin";
import { ReviewAdmin } from "./ReviewAdmin";
import { VisitStats } from "./VisitStats";
import { GamePrizeAdmin } from "./GamePrizeAdmin";
import { CustomersAdmin } from "./CustomersAdmin";
import { FeedbackAdmin } from "./FeedbackAdmin";
import { LenkoTriviaAdmin } from "./LenkoTriviaAdmin";
import { MODEL_CATEGORIES } from "@/lib/modelsMarket";

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
    {
      name: "isWelcome",
      label: "Welcome song",
      type: "checkbox",
      placeholder: "Play 30 seconds of this song when someone opens the site (upload its MP3 below)",
    },
    { name: "hidden", label: "Hidden — don't show on the site", type: "checkbox" },
    { name: "cover", label: "Cover image", type: "file", accept: "image/*" },
    {
      name: "audio",
      label: "MP3 file",
      type: "file",
      accept: "audio/*",
      hint: "Kept private: fans hear a short preview (and the welcome song clip); the full file is only sent after purchase when Downloadable is ticked.",
    },
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
    {
      name: "isWelcome",
      label: "Welcome beat",
      type: "checkbox",
      placeholder: "Loop this beat when someone opens the site (only if no welcome song is set)",
    },
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
    { name: "replaceImages", label: "Photos", type: "checkbox", placeholder: "Replace all photos with the ones above (instead of adding)" },
  ],
};

/** Worn on Set — used pieces from the shoots, always sold by auction. */
const WORN: ResourceConfig = {
  key: "worn",
  label: "Worn on Set pieces",
  endpoint: "/worn",
  primary: "name",
  fields: [
    {
      name: "name",
      label: "Title",
      type: "text",
      required: true,
      placeholder: "Black Hoodie — Worn in “It's Working” video",
    },
    { name: "wornIn", label: "Worn in (video or shoot)", type: "text", placeholder: "It's Working video" },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "condition",
      label: "Condition notes",
      type: "text",
      placeholder: "Used — worn on set, light wear on the cuffs, washed",
      hint: "Shown next to the “Used — worn during video shoot” label.",
    },
    { name: "sizes", label: "Size", type: "text", placeholder: "L" },
    { name: "auctionStartGhs", label: "Starting bid (GH₵)", type: "number", default: "100" },
    { name: "auctionIncrementGhs", label: "Minimum raise per bid (GH₵)", type: "number", default: "20", hint: "e.g. 20 or 50" },
    {
      name: "auctionEndsAt",
      label: "Auction ends",
      type: "datetime",
      hint: "Set automatically: 14 days after the first bid (Ghana time). Change it only to extend or shorten a running auction. Bids in the last 2 minutes add 2 minutes.",
    },
    {
      name: "auctionPayWindowHours",
      label: "Winner must pay within (hours)",
      type: "number",
      default: "48",
      hint: "If they don't, it's offered to the next highest bidder automatically.",
    },
    { name: "hidden", label: "Hidden — don't show on the site", type: "checkbox" },
    {
      name: "auctionReset",
      label: "Relist",
      type: "checkbox",
      placeholder: "Delete all bids and start a fresh auction (the 14-day clock starts again with the next first bid)",
    },
    {
      name: "images",
      label: "Photos — pick several at once (the first is the main photo)",
      type: "file",
      accept: "image/*",
      multiple: true,
    },
    { name: "replaceImages", label: "Photos", type: "checkbox", placeholder: "Replace all photos with the ones above (instead of adding)" },
  ],
};

const LIVE: ResourceConfig = {
  key: "live",
  label: "Live Shows",
  endpoint: "/live",
  primary: "title",
  fields: [
    { name: "title", label: "Show title", type: "text", required: true, placeholder: "Lenko Psycho — Live from the Yard" },
    { name: "startsAt", label: "Starts at", type: "datetime", hint: "Ghana time." },
    { name: "durationMins", label: "Length (minutes)", type: "number", default: "120" },
    { name: "priceGhs", label: "Ticket price (GH₵)", type: "number", default: "50" },
    {
      name: "streamUrl",
      label: "Unlisted YouTube Live link",
      type: "url",
      placeholder: "https://youtube.com/live/…",
      hint: "Set the stream to Unlisted on YouTube. Only people with a paid ticket ever see this link.",
    },
    { name: "description", label: "Description (what's in the show)", type: "textarea" },
    { name: "replay", label: "Replay", type: "checkbox", placeholder: "Ticket holders can watch the replay after the show" },
    { name: "hidden", label: "Hidden — don't show on the site", type: "checkbox" },
    { name: "poster", label: "Poster image (16:9 works best)", type: "file", accept: "image/*" },
  ],
};

const GALLERY: ResourceConfig = {
  key: "gallery",
  label: "Behind the Scenes photos",
  endpoint: "/gallery",
  primary: "caption",
  fields: [
    {
      name: "images",
      label: "Photos — pick several at once to add them all",
      type: "file",
      accept: "image/*",
      multiple: true,
    },
    { name: "caption", label: "Caption (optional)", type: "text", placeholder: "Lenko on set" },
    { name: "shoot", label: "Shoot / event (optional)", type: "text", placeholder: "It's Working video" },
    { name: "order", label: "Sort order (lower shows first)", type: "number", default: "0" },
    { name: "hidden", label: "Hidden — don't show on the site", type: "checkbox" },
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
    { name: "name", label: "Stage / model name", type: "text", required: true },
    {
      name: "accountEmail",
      label: "Linked account email (lets the model accept bookings)",
      type: "text",
      placeholder: "The email they signed up with",
    },
    { name: "rateGhs", label: "Starting rate (GH₵, min 2,000)", type: "number", default: "2000" },
    { name: "location", label: "Location", type: "text" },
    {
      name: "categories",
      label: "Shoot types (comma separated)",
      type: "text",
      placeholder: `${MODEL_CATEGORIES.join(", ")}`,
    },
    { name: "availability", label: "Availability", type: "text" },
    { name: "height", label: "Height", type: "text" },
    { name: "languages", label: "Languages (comma separated)", type: "text" },
    { name: "instagram", label: "Instagram handle", type: "text" },
    { name: "tiktok", label: "TikTok handle", type: "text" },
    { name: "legalName", label: "Legal name (private)", type: "text" },
    { name: "phone", label: "Phone (private — shared after payment)", type: "text" },
    { name: "email", label: "Contact email (private — shared after payment)", type: "text" },
    { name: "age", label: "Age (private, 18+)", type: "number" },
    { name: "weight", label: "Weight (private)", type: "text" },
    { name: "bio", label: "Short bio / description", type: "textarea" },
    { name: "experience", label: "Experience", type: "textarea" },
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
    { name: "video", label: "Intro video (optional — replaces the current one)", type: "file", accept: "video/*" },
  ],
};

const TABS = [
  { key: "review", label: "★ Review" },
  { key: "customers", label: "👥 Customers" },
  { key: "feedback", label: "💬 Feedback" },
  { key: "releases", label: "Releases" },
  { key: "beats", label: "Beats" },
  { key: "worn", label: "🧥 Worn on Set" },
  { key: "merch", label: "Merch Shop" },
  { key: "gallery", label: "Behind the Scenes" },
  { key: "live", label: "Live Shows" },
  { key: "prize", label: "Game Prize" },
  { key: "trivia", label: "🧠 Lenko Trivia" },
  { key: "videos", label: "Contest Videos" },
  { key: "models", label: "Models" },
  { key: "bookings", label: "Bookings" },
  { key: "inquiries", label: "Inquiries" },
  { key: "orders", label: "Orders" },
  { key: "donations", label: "Donations" },
] as const;

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("releases");
  // A customer opened from elsewhere (e.g. "View customer" on a feedback message)
  const [customerId, setCustomerId] = useState<string | null>(null);
  const openCustomer = (id: string) => {
    setCustomerId(id);
    setTab("customers");
  };
  // Back from paying a prize deposit on Paystack → straight to the Game Prize tab (it confirms the payment).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("prizeDeposit")) setTab("prize");
  }, []);

  return (
    <div className="container-page py-10" data-clarity-mask="true">
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
              tab === t.key ? "bg-accent text-white" : "text-neutral-300 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "review" && <ReviewAdmin />}
      {tab === "customers" && <CustomersAdmin openId={customerId} onOpenChange={setCustomerId} />}
      {tab === "feedback" && <FeedbackAdmin onOpenCustomer={openCustomer} />}
      {tab === "releases" && <CatalogAdmin config={RELEASES} />}
      {tab === "beats" && <CatalogAdmin config={BEATS} />}
      {tab === "worn" && <CatalogAdmin config={WORN} />}
      {tab === "merch" && <CatalogAdmin config={MERCH} />}
      {tab === "gallery" && <CatalogAdmin config={GALLERY} />}
      {tab === "live" && <CatalogAdmin config={LIVE} />}
      {tab === "prize" && <GamePrizeAdmin />}
      {tab === "trivia" && <LenkoTriviaAdmin />}
      {tab === "videos" && <CatalogAdmin config={VIDEOS} />}
      {tab === "models" && <CatalogAdmin config={MODELS} />}
      {tab === "bookings" && <BookingsAdmin />}
      {tab === "inquiries" && <InboxAdmin kind="inquiries" />}
      {tab === "orders" && <InboxAdmin kind="orders" />}
      {tab === "donations" && <InboxAdmin kind="donations" />}
    </div>
  );
}
