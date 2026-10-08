"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CoverArt } from "./CoverArt";
import { Star } from "./StarRating";
import { useFanAuth, getFanToken } from "./FanAuthProvider";
import {
  getModelItem,
  submitBooking,
  type ModelProfileItem,
  type ModelReview,
} from "@/lib/api";
import { MODEL_CATEGORIES, ghs, instagramUrl, tiktokUrl } from "@/lib/modelsMarket";
import { cdnImage } from "@/lib/cdn";

/** Modal: a model's profile (photos/video, details, reviews) + the booking form. */
export function BookModelDialog({
  model,
  onClose,
}: {
  model: ModelProfileItem;
  onClose: () => void;
}) {
  const { user, loading } = useFanAuth();
  // Gallery items: every photo, then the intro video (if any).
  const media = [
    ...model.photos.map((src) => ({ kind: "photo" as const, src })),
    ...(model.video ? [{ kind: "video" as const, src: model.video }] : []),
  ];
  const [active, setActive] = useState(0);
  const [reviews, setReviews] = useState<ModelReview[]>([]);

  useEffect(() => {
    getModelItem(model.slug).then((m) => setReviews(m?.reviews ?? []));
  }, [model.slug]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = media[active];
  const details = [
    ["Location", model.location],
    ["Height", model.height],
    ["Availability", model.availability],
    ["Languages", model.languages.join(", ")],
  ].filter((d): d is [string, string] => Boolean(d[1]));

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Book ${model.name}`}
        className="card animate-fade-up relative my-8 w-full max-w-4xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-neutral-200 transition hover:bg-black/70 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          {/* Gallery */}
          <div className="bg-ink-800">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
              {current?.kind === "video" ? (
                <video
                  key={current.src}
                  src={current.src}
                  controls
                  playsInline
                  autoPlay
                  className="h-full w-full object-contain"
                />
              ) : (
                <CoverArt src={current?.src} alt={model.name} label={model.name} />
              )}
            </div>
            {media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {media.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={item.kind === "video" ? "Play intro video" : `Photo ${i + 1}`}
                    className={`relative grid h-14 w-12 shrink-0 place-items-center overflow-hidden rounded-md border-2 bg-ink-700 transition ${
                      i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    {item.kind === "video" ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cdnImage(item.src, 120)} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile + booking */}
          <div className="p-6">
            <h2 className="pr-10 font-display text-2xl font-bold text-white">{model.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {model.rating ? (
                <span className="flex items-center gap-1 text-neutral-300">
                  <Star filled size={15} />
                  <span className="font-semibold text-white">{model.rating.avg.toFixed(1)}</span>
                  <span className="text-neutral-500">
                    ({model.rating.count} review{model.rating.count === 1 ? "" : "s"})
                  </span>
                </span>
              ) : (
                <span className="text-neutral-500">New on DMY</span>
              )}
              <span className="rounded-full bg-accent/15 px-3 py-0.5 text-sm font-bold text-accent">
                Starting rate: {ghs(model.rateGhs)}
              </span>
            </div>

            {model.categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {model.categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-neutral-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {details.length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</dt>
                    <dd className="text-neutral-200">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {model.bio && <p className="mt-4 text-sm leading-relaxed text-neutral-400">{model.bio}</p>}
            {model.experience && (
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                <span className="font-semibold text-neutral-200">Experience: </span>
                {model.experience}
              </p>
            )}

            {(model.instagram || model.tiktok) && (
              <div className="mt-4 flex gap-3 text-sm">
                {model.instagram && (
                  <a
                    href={instagramUrl(model.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Instagram @{model.instagram}
                  </a>
                )}
                {model.tiktok && (
                  <a
                    href={tiktokUrl(model.tiktok)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    TikTok @{model.tiktok}
                  </a>
                )}
              </div>
            )}

            <div className="mt-6 border-t border-white/[0.06] pt-5">
              {loading ? null : user ? (
                <BookingForm model={model} defaults={{ name: user.name ?? "", phone: user.phone ?? "" }} />
              ) : (
                <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-4 text-sm text-neutral-300">
                  <p className="font-semibold text-white">Sign in to book {model.name}</p>
                  <p className="mt-1">
                    It&apos;s free. You only pay once {model.name} accepts your request.
                  </p>
                  <Link
                    href={`/account?next=${encodeURIComponent(`/models?book=${model.slug}`)}`}
                    className="btn-accent mt-3 w-full justify-center"
                  >
                    Sign in / create account
                  </Link>
                </div>
              )}
            </div>

            {reviews.length > 0 && (
              <div className="mt-6 border-t border-white/[0.06] pt-5">
                <p className="mb-3 text-sm font-semibold text-white">Reviews</p>
                <ul className="space-y-3">
                  {reviews.map((r, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} filled={n <= r.stars} size={13} />
                          ))}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {r.name} · {new Date(r.date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {r.comment && <p className="mt-1 text-neutral-300">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Date → time → location → shoot type → duration → models → requirements → offer. */
function BookingForm({
  model,
  defaults,
}: {
  model: ModelProfileItem;
  defaults: { name: string; phone: string };
}) {
  const shootTypes: readonly string[] = model.categories.length ? model.categories : MODEL_CATEGORIES;
  const [form, setForm] = useState({
    date: "",
    time: "",
    location: "",
    eventType: shootTypes[0] ?? "",
    durationHours: "2",
    modelsCount: "1",
    message: "",
    offerGhs: String(model.rateGhs),
    clientName: defaults.name,
    phone: defaults.phone,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await submitBooking(token, {
        modelId: model.id,
        clientName: form.clientName,
        phone: form.phone,
        date: form.date,
        time: form.time,
        location: form.location,
        eventType: form.eventType,
        durationHours: Number(form.durationHours),
        modelsCount: Number(form.modelsCount),
        message: form.message || undefined,
        offerGhs: Number(form.offerGhs),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-white">
        <p className="font-semibold">✓ Request sent to {model.name}</p>
        <p className="mt-1 text-neutral-300">
          You&apos;ll get an email when they respond. If they accept, you pay through DMY to confirm.
        </p>
        <Link href="/account" className="mt-3 inline-block font-semibold text-accent hover:underline">
          Track it in your bookings →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="font-semibold text-white">Book {model.name}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="bk-date">Date *</label>
          <input id="bk-date" type="date" required min={today} value={form.date} onChange={set("date")} className="input [color-scheme:dark]" />
        </div>
        <div>
          <label className="label" htmlFor="bk-time">Start time *</label>
          <input id="bk-time" type="time" required value={form.time} onChange={set("time")} className="input [color-scheme:dark]" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="bk-location">Location *</label>
        <input id="bk-location" required placeholder="e.g. East Legon, Accra" value={form.location} onChange={set("location")} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="bk-type">Type of shoot *</label>
          <select id="bk-type" required value={form.eventType} onChange={set("eventType")} className="input">
            {shootTypes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="bk-duration">Duration (hours) *</label>
          <input id="bk-duration" type="number" required min={1} max={24} value={form.durationHours} onChange={set("durationHours")} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="bk-count">Models needed in total</label>
        <input id="bk-count" type="number" min={1} max={50} value={form.modelsCount} onChange={set("modelsCount")} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="bk-req">Special requirements</label>
        <textarea id="bk-req" placeholder="Outfits, look, scenes, anything they should know" value={form.message} onChange={set("message")} className="input min-h-[70px]" />
      </div>
      <div>
        <label className="label" htmlFor="bk-offer">Your offer (GH₵) *</label>
        <input id="bk-offer" type="number" required min={model.rateGhs} step={50} value={form.offerGhs} onChange={set("offerGhs")} className="input" />
        <p className="mt-1 text-xs text-neutral-500">From {ghs(model.rateGhs)}. The model confirms the final price when they accept.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="bk-name">Your name *</label>
          <input id="bk-name" required value={form.clientName} onChange={set("clientName")} className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="bk-phone">Phone / WhatsApp *</label>
          <input id="bk-phone" type="tel" required value={form.phone} onChange={set("phone")} className="input" autoComplete="tel" />
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="btn-accent w-full justify-center">
        {busy ? "Sending…" : "Request booking"}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-neutral-500">
        No payment yet. {model.name} accepts first, then you pay through DMY to confirm. Contact
        details are shared once the booking is paid.
      </p>
    </form>
  );
}
