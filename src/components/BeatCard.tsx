import { type Beat, downloadFreeBeatUrl } from "@/lib/api";
import { CoverArt } from "./CoverArt";
import { AddToCartButton } from "./AddToCartButton";
import { PlayButton } from "./PlayButton";
import { FreeDownloadButton, LicenseButton } from "./SupportTheYard";

export function BeatCard({ beat }: { beat: Beat }) {
  return (
    <article className="card-hover group overflow-hidden">
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <CoverArt
          src={beat.coverImage}
          alt={`${beat.title}${beat.genre ? ` — ${beat.genre}` : ""} free beat by Dark Music Yard`}
          label={beat.title}
          className="transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-700/90 via-ink-700/10 to-transparent" />
        {beat.genre && (
          <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-ink/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent backdrop-blur">
            {beat.genre}
          </span>
        )}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
          <h3 className="text-lg font-semibold text-white drop-shadow">{beat.title}</h3>
          {beat.hasFreeMp3 && beat.streamUrl && (
            <PlayButton
              track={{
                id: `beat:${beat.id}`,
                title: beat.title,
                subtitle: beat.genre ? `${beat.genre} · Free beat` : "Free beat",
                src: beat.streamUrl,
                coverImage: beat.coverImage,
              }}
              className="h-11 w-11 shrink-0"
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pt-4">
        {beat.hasFreeMp3 ? (
          <FreeDownloadButton
            href={`${downloadFreeBeatUrl(beat.slug)}?download=1`}
            title={beat.title}
            className="btn-outline min-h-[44px] px-3 py-2 text-xs"
          />
        ) : (
          <span className="btn-outline pointer-events-none min-h-[44px] px-3 py-2 text-xs opacity-50">
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
            className="btn-accent min-h-[44px] px-3 py-2 text-xs"
            label="WAV · your price"
          />
        ) : (
          <span className="btn-accent pointer-events-none min-h-[44px] px-3 py-2 text-xs opacity-50">
            WAV · soon
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-2 text-[11px] text-neutral-500">
        <span>Free to record on · no Content ID</span>
        <LicenseButton className="min-h-[36px] px-2 font-semibold text-neutral-300 underline-offset-2 hover:text-accent hover:underline" />
      </div>
    </article>
  );
}
