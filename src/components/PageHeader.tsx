import type { SitePhoto } from "@/config/media";
import { LoopVideo } from "./LoopVideo";

/**
 * Page title band. With `image`, the photo sits beside the title as a framed
 * card on desktop and as a dimmed backdrop behind the text everywhere; set
 * `image.video` to loop a clip in the card instead (the photo is its poster).
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  image,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: SitePhoto & { video?: string };
}) {
  return (
    <header className="relative overflow-hidden border-b border-white/[0.06]">
      {image && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt=""
            className="h-full w-full object-cover opacity-70 lg:scale-110 lg:opacity-25 lg:blur-sm"
            style={{ objectPosition: image.position }}
          />
          {/* Phones: the photo is the backdrop, shaded top-to-bottom behind the text */}
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink lg:hidden" />
          {/* Desktop: the framed card carries the photo, so the backdrop is just mood */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-ink via-ink/75 to-ink/25 lg:block" />
          <div className="absolute inset-0 hidden bg-gradient-to-t from-ink via-ink/10 to-ink/50 lg:block" />
        </div>
      )}
      {/* Top glow — photo headers skip it (its hard lower edge shows over a photo) */}
      {!image && (
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-64 bg-[radial-gradient(50%_100%_at_50%_100%,rgba(239,43,45,0.16),transparent)]" />
      )}
      <div
        className={`container-page relative py-20 sm:py-24 ${
          image ? "lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-14 lg:py-14" : ""
        }`}
      >
        <div>
          {eyebrow && (
            <p className="eyebrow mb-4 animate-fade-up">
              <span className="h-px w-6 bg-accent" />
              {eyebrow}
            </p>
          )}
          <h1 className="display-sm max-w-3xl text-white text-balance animate-fade-up">{title}</h1>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-neutral-300/90 animate-fade-up">
              {subtitle}
            </p>
          )}
        </div>

        {image && (
          <div className="relative hidden animate-fade-up lg:block">
            <div aria-hidden className="absolute -inset-6 rounded-[2.5rem] bg-accent/15 blur-3xl" />
            <div className="relative h-80 w-64 rotate-2 overflow-hidden rounded-3xl border border-white/10 shadow-card">
              {image.video ? (
                <LoopVideo
                  src={image.video}
                  poster={image.src}
                  label={image.alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: image.position }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
