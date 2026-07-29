/**
 * A still-frame poster for a video cover. Prefers an admin-set thumbnail; for
 * Cloudinary-hosted videos it extracts an actual frame from the video (so the
 * cover is the video itself, not an unrelated image); otherwise returns
 * undefined so the browser shows the video's own first frame.
 */
export function videoPoster(videoUrl: string, adminPoster?: string): string | undefined {
  if (adminPoster) return adminPoster;
  if (/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(videoUrl)) {
    return videoUrl
      .replace("/video/upload/", "/video/upload/so_1/")
      .replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, ".jpg");
  }
  return undefined;
}
