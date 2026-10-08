/**
 * Ask Cloudinary for a right-sized copy of an uploaded image: `w_` caps the
 * width (never upscales), `f_auto` serves AVIF/WebP where supported, `q_auto`
 * picks the compression. Typically 60–80% smaller than the original upload.
 * Other URLs (local files, external news images) pass through untouched.
 */
export function cdnImage<T extends string | null | undefined>(src: T, width: number): T {
  if (!src || !src.includes("res.cloudinary.com") || !src.includes("/image/upload/")) return src;
  // Leave URLs that already carry a transformation alone.
  if (/\/image\/upload\/(?!v\d+\/)[^/]*(?:w_|f_auto|q_auto|c_)/.test(src)) return src;
  return src.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`) as T;
}
