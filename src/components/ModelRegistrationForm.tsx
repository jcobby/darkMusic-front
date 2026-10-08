"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getFanToken } from "./FanAuthProvider";
import { submitModelContent, type ModelRegistration } from "@/lib/api";
import { MODELS_MARKET, MODEL_CATEGORIES, MODEL_DECLARATIONS } from "@/lib/modelsMarket";

const fileInputClass =
  "block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-600 file:px-3 file:py-2 file:text-sm file:text-neutral-100";

type TextKey = Exclude<keyof ModelRegistration, "categories" | "agree" | "photos" | "video">;

/** Full DMY Models registration — goes to the admin review queue. */
export function ModelRegistrationForm({
  defaults,
  onSubmitted,
}: {
  defaults: { name: string; phone: string; email: string };
  onSubmitted: () => void;
}) {
  const [f, setF] = useState<Record<TextKey, string>>({
    name: "",
    legalName: defaults.name,
    phone: defaults.phone,
    email: defaults.email,
    location: "",
    age: "",
    height: "",
    weight: "",
    experience: "",
    bio: "",
    languages: "",
    rateGhs: String(MODELS_MARKET.minRateGhs),
    availability: "",
    instagram: "",
    tiktok: "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [agree, setAgree] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: TextKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));
  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token) return;
    const problem =
      Number(f.age) < MODELS_MARKET.minAge
        ? `Models must be ${MODELS_MARKET.minAge} or older`
        : categories.length === 0
        ? "Pick at least one shoot type"
        : photos.length < MODELS_MARKET.minPhotos
        ? `Add at least ${MODELS_MARKET.minPhotos} portfolio photos`
        : photos.length > MODELS_MARKET.maxPhotos
        ? `Add up to ${MODELS_MARKET.maxPhotos} photos`
        : agree.length < MODEL_DECLARATIONS.length
        ? "Tick every declaration to register"
        : null;
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitModelContent(token, { ...f, categories, agree, photos, video });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  const input = (k: TextKey, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`mr-${k}`}>
        {label}
      </label>
      <input id={`mr-${k}`} className="input" value={f[k]} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-5">
      <p className="text-sm text-neutral-400">
        DMY reviews every profile before it goes live. Clients book and pay through DMY; you
        receive your rate minus DMY&apos;s {MODELS_MARKET.commissionRate * 100}% commission after
        the shoot.
      </p>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Personal</legend>
        {input("name", "Stage / model name *", { required: true, maxLength: 80 })}
        {input("legalName", "Full legal name * (private)", { required: true, autoComplete: "name" })}
        <div className="grid grid-cols-2 gap-3">
          {input("phone", "Phone * (private)", { required: true, type: "tel", autoComplete: "tel" })}
          {input("age", "Age *", { required: true, type: "number", min: MODELS_MARKET.minAge, max: 100 })}
        </div>
        {input("email", "Contact email (private)", { type: "email", autoComplete: "email" })}
        {input("location", "Location *", { required: true, placeholder: "e.g. Accra" })}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Professional</legend>
        <div className="grid grid-cols-2 gap-3">
          {input("height", "Height *", { required: true, placeholder: "e.g. 5'8\" / 173cm" })}
          {input("weight", "Weight * (private)", { required: true, placeholder: "e.g. 60kg" })}
        </div>
        <div>
          <span className="label">Shoot types *</span>
          <div className="flex flex-wrap gap-2">
            {MODEL_CATEGORIES.map((c) => {
              const on = categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategories((l) => toggle(l, c))}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    on
                      ? "border-accent bg-accent/15 text-white"
                      : "border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/25"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {input("rateGhs", "Starting rate (GH₵) *", {
            required: true,
            type: "number",
            min: MODELS_MARKET.minRateGhs,
            step: 50,
          })}
          {input("languages", "Languages", { placeholder: "English, Twi" })}
        </div>
        {input("availability", "Availability *", { required: true, placeholder: "e.g. Weekends, weekday evenings" })}
        <div>
          <label className="label" htmlFor="mr-experience">
            Experience
          </label>
          <textarea
            id="mr-experience"
            className="input min-h-[60px]"
            placeholder="Past shoots, videos, brands, events…"
            value={f.experience}
            onChange={set("experience")}
          />
        </div>
        <div>
          <label className="label" htmlFor="mr-bio">
            Short bio
          </label>
          <textarea id="mr-bio" className="input min-h-[60px]" value={f.bio} onChange={set("bio")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {input("instagram", "Instagram", { placeholder: "@handle" })}
          {input("tiktok", "TikTok", { placeholder: "@handle" })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Portfolio</legend>
        <div>
          <label className="label" htmlFor="mr-photos">
            Photos * ({MODELS_MARKET.minPhotos}–{MODELS_MARKET.maxPhotos}, first is your main shot)
          </label>
          <input
            id="mr-photos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            className={fileInputClass}
          />
          {photos.length > 0 && <p className="mt-1 text-xs text-neutral-500">{photos.length} selected</p>}
        </div>
        <div>
          <label className="label" htmlFor="mr-video">
            Intro video (optional, up to 100MB)
          </label>
          <input
            id="mr-video"
            type="file"
            accept="video/*"
            onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
            className={fileInputClass}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Declarations</legend>
        {MODEL_DECLARATIONS.map((d) => (
          <label key={d.key} className="flex cursor-pointer items-start gap-2.5 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={agree.includes(d.key)}
              onChange={() => setAgree((l) => toggle(l, d.key))}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span>
              {d.key === "terms" ? (
                <>
                  I agree to the{" "}
                  <Link href="/models/terms" target="_blank" className="text-accent hover:underline">
                    DMY Models Terms
                  </Link>
                  .
                </>
              ) : (
                d.label
              )}
            </span>
          </label>
        ))}
      </fieldset>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="btn-accent w-full justify-center">
        {busy ? "Uploading…" : "Submit for review"}
      </button>
    </form>
  );
}
