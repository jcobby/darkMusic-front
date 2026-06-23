export type SpotifyType = "track" | "album" | "playlist" | "artist" | "episode" | "show";

export interface SpotifyEmbedInfo {
  type: SpotifyType;
  id: string;
  src: string;
}

/**
 * Parses a Spotify URL (track/album/playlist/artist/…) into an embeddable
 * player src. Tolerates locale paths (/intl-xx/) and ?si= query params.
 * Returns null for non-embeddable or placeholder URLs.
 */
export function spotifyEmbed(url?: string | null): SpotifyEmbedInfo | null {
  if (!url) return null;
  const m = url.match(
    /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/i
  );
  if (!m) return null;
  const type = m[1].toLowerCase() as SpotifyType;
  const id = m[2];
  return {
    type,
    id,
    src: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
  };
}
