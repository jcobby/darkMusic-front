/** Extracts a YouTube video id from common URL shapes. */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  // Reject obvious placeholder ids that aren't 11 valid chars.
  return null;
}
