import { spotifyEmbed } from "@/lib/spotify";

/**
 * Official Spotify player embed. Plays in-page (counts as a Spotify stream).
 * Falls back to a "Listen on Spotify" link, or a hint when no link is set.
 */
export function SpotifyEmbed({
  url,
  compact = false,
  title = "Spotify player",
}: {
  url?: string | null;
  compact?: boolean;
  title?: string;
}) {
  const info = spotifyEmbed(url);

  if (!info) {
    if (url) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline w-full"
        >
          Listen on Spotify
        </a>
      );
    }
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center text-xs text-neutral-500">
        Add this song&apos;s Spotify link in the dashboard to enable the player.
      </div>
    );
  }

  const height = compact ? 152 : info.type === "track" ? 352 : 380;

  return (
    <iframe
      title={title}
      src={info.src}
      width="100%"
      height={height}
      style={{ border: 0, borderRadius: 16 }}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  );
}
