import type { Beat } from "@/lib/api";
import { downloadFreeBeatUrl } from "@/lib/api";
import { beatLicense } from "@/config/site";
import { CoverArt } from "./CoverArt";
import { AddToCartButton } from "./AddToCartButton";
import { PlayButton } from "./PlayButton";

export function BeatCard({ beat }: { beat: Beat }) {
  return (
    <article className="card-hover group overflow-hidden">
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <CoverArt
          src={beat.coverImage}
          alt={beat.title}
          label={beat.title}
          className="transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-700/90 via-ink-700/10 to-transparent" />
        {beat.genre && (
          <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-ink/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent backdrop-blur">
            {beat.genre}
          </span>
        )}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <h3 className="text-lg font-semibold text-white drop-shadow">{beat.title}</h3>
          {beat.hasFreeMp3 && (
            <PlayButton
              track={{
                id: `beat:${beat.id}`,
                title: beat.title,
                subtitle: beat.genre ? `${beat.genre} · Free beat` : "Free beat",
                src: downloadFreeBeatUrl(beat.slug),
                coverImage: beat.coverImage,
              }}
              className="h-9 w-9"
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pt-4">
        {beat.hasFreeMp3 ? (
          <a
            href={`${downloadFreeBeatUrl(beat.slug)}?download=1`}
            className="btn-outline px-3 py-2 text-xs"
          >
            MP3 · Free
          </a>
        ) : (
          <span className="btn-outline pointer-events-none px-3 py-2 text-xs opacity-50">
            MP3 · soon
          </span>
        )}
        {beat.wavAvailable ? (
          <AddToCartButton
            kind="beat_wav"
            refId={beat.id}
            name={`${beat.title} (WAV)`}
            priceGhs={beat.wavPriceGhs}
            image={beat.coverImage}
            digital
            className="btn-accent px-3 py-2 text-xs"
            label={`WAV · GH₵${beat.wavPriceGhs}`}
          />
        ) : (
          <span className="btn-accent pointer-events-none px-3 py-2 text-xs opacity-50">
            WAV · soon
          </span>
        )}
      </div>
      <p className="mt-3 border-t border-white/[0.06] px-4 pb-4 pt-3 text-[10px] leading-relaxed text-neutral-500">
        {beatLicense}
      </p>
    </article>
  );
}
