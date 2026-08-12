const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ---------- Types ----------
export interface Release {
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
  spotifyUrl: string | null;
  appleUrl: string | null;
  youtubeUrl: string | null;
  isFeatured: boolean;
  isWelcome: boolean;
  downloadable: boolean;
  hasPreview: boolean;
  priceGhs: number;
}

export interface Beat {
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
  genre: string | null;
  hasFreeMp3: boolean;
  streamUrl: string | null; // direct Cloudinary URL for in-page playback
  downloadUrl: string | null; // direct Cloudinary URL that forces download
  wavAvailable: boolean;
  wavPriceGhs: number;
  isFeatured: boolean;
}

export interface Merch {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  category: string;
  priceGhs: number;
  sizes: string[];
  stock: number;
  isLimited: boolean;
  isSigned: boolean;
  isFeatured: boolean;
  inStock: boolean;
}

export interface OrderSummary {
  reference: string;
  status: "pending" | "paid" | "failed";
  totalGhs: number;
  items: { name: string; qty: number; amountGhs: number; kind: string }[];
  downloads: { name: string; url: string; expiresAt: string }[];
}

export interface CartLine {
  kind: "release_mp3" | "beat_wav" | "merch";
  refId: string;
  qty?: number;
  size?: string;
  amountGhs?: number; // fan-chosen donation for digital items (min 5)
}

// ---------- Helpers ----------
async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Server-safe GET that returns a fallback instead of throwing (for listings). */
async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export const downloadFreeBeatUrl = (slug: string) => `${API_URL}/beats/${slug}/free`;
export const releasePreviewUrl = (slug: string) => `${API_URL}/releases/${slug}/preview`;

// ---------- Catalog ----------
export const getReleases = (featured = false) =>
  safeGet<Release[]>(`/releases${featured ? "?featured=true" : ""}`, []);
/** Releases ranked by on-site plays (falls back to newest on a fresh site). */
export const getTrending = () => safeGet<Release[]>(`/trending`, []);

// ---------- Content-creation videos (rateable) ----------
export interface VideoItem {
  id: string;
  title: string;
  creator: string | null;
  description: string | null;
  videoUrl: string;
  poster?: string;
  avgRating: number;
  ratingCount: number;
  myStars: number;
  voteCount: number;
  myVote: boolean;
}
export async function getVideos(
  category: "creator" | "fan" | "shorts",
  token?: string | null
): Promise<VideoItem[]> {
  try {
    const res = await fetch(`${API_URL}/videos?category=${category}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as VideoItem[];
  } catch {
    return [];
  }
}
export async function rateVideo(
  token: string,
  videoId: string,
  stars: number
): Promise<{ avgRating: number; ratingCount: number; myStars: number }> {
  const res = await fetch(`${API_URL}/videos/${videoId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ stars }),
  });
  return handle(res);
}
/** Cast/move the fan's single "best video" contest vote (toggles off if same). */
export async function voteVideo(
  token: string,
  videoId: string
): Promise<{ myVote: boolean; voteCount: number }> {
  const res = await fetch(`${API_URL}/videos/${videoId}/vote`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}
export const getReleaseItem = (slug: string) =>
  safeGet<Release | null>(`/releases/${slug}`, null);

export interface WelcomeTrack {
  kind: "release" | "beat";
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
  spotifyUrl: string | null;
  hasPreview: boolean; // release with uploaded audio
  hasFreeMp3: boolean; // beat with a free MP3
  audioUrl: string | null; // direct, playable Cloudinary URL (preview or free beat)
}
export const getWelcomeTrack = () => safeGet<WelcomeTrack | null>(`/welcome`, null);

// ---------- Visit counter (public) ----------
export async function recordVisit(): Promise<number | null> {
  try {
    const res = await fetch(`${API_URL}/visits`, { method: "POST" });
    if (!res.ok) return null;
    return ((await res.json()) as { visits: number }).visits;
  } catch {
    return null;
  }
}
export const getVisitTotal = () =>
  safeGet<{ visits: number }>(`/visits`, { visits: 0 }).then((d) => d.visits);

// ---------- Live stats (public) ----------
/** Fire-and-forget: count one on-site audio play. Optionally attributes it to a
 *  specific track so it can rank in "Trending". Never throws. */
export async function recordPlay(kind?: "release" | "beat", refId?: string): Promise<void> {
  try {
    await fetch(`${API_URL}/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kind && refId ? { kind, refId } : {}),
    });
  } catch {
    /* non-critical */
  }
}

export interface LiveStats {
  plays: number;
  downloads: number;
  beats: number;
  merch: number;
  countries: number;
}
export const getLiveStats = () =>
  safeGet<LiveStats>(`/stats`, { plays: 0, downloads: 0, beats: 0, merch: 0, countries: 0 });

// ---------- News (public RSS aggregate) ----------
export interface NewsItem {
  title: string;
  link: string;
  source: string;
  date: string | null;
  image: string | null;
  category: "news" | "hiphop" | "release";
}
export interface NewsData {
  updatedAt: string;
  news: NewsItem[];
  hiphop: NewsItem[];
  releases: NewsItem[];
}
export const getNews = () =>
  safeGet<NewsData>(`/news`, { updatedAt: "", news: [], hiphop: [], releases: [] });

// ---------- Fan accounts ----------
export interface FanUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  points: number;
  streak: number;
  lastCheckIn: string | null;
  referralCode: string;
  streamUntil: string | null;
}
export async function registerFan(payload: {
  email: string;
  password: string;
  name?: string;
  ref?: string;
}): Promise<{ token: string; user: FanUser }> {
  const res = await fetch(`${API_URL}/account/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res);
}
export async function checkInFan(
  token: string
): Promise<{ awarded: number; alreadyCheckedIn: boolean; user: FanUser }> {
  const res = await fetch(`${API_URL}/account/checkin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}
export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/account/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handle(res);
}
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/account/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handle(res);
}
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/account/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  return handle(res);
}
export async function verifyEmail(token: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/account/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return handle(res);
}
export async function resendVerification(token: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/account/resend-verification`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

// ---------- Streaming pass ----------
export async function initStreamPass(
  token: string,
  amountGhs: number
): Promise<{ authorizationUrl: string; reference: string; amountGhs: number }> {
  const res = await fetch(`${API_URL}/account/stream-pass/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amountGhs }),
  });
  return handle(res);
}
export async function verifyStreamPass(
  token: string,
  reference: string
): Promise<{ status: string; streamUntil: string | null }> {
  const res = await fetch(
    `${API_URL}/account/stream-pass/verify?reference=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  return handle(res);
}
/** Signed full-song URL for subscribers, or null if not entitled/available. */
export async function getStreamUrl(token: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/stream/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as { url: string }).url;
  } catch {
    return null;
  }
}

// ---------- Favourites ----------
export interface FavoriteItem {
  kind: "release" | "beat";
  refId: string;
  title: string;
  slug: string;
  coverImage?: string;
}
export async function getFavorites(token: string): Promise<FavoriteItem[]> {
  try {
    const res = await fetch(`${API_URL}/account/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as FavoriteItem[];
  } catch {
    return [];
  }
}
export async function addFavorite(token: string, kind: "release" | "beat", refId: string) {
  await fetch(`${API_URL}/account/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind, refId }),
  });
}
export async function removeFavorite(token: string, kind: "release" | "beat", refId: string) {
  await fetch(`${API_URL}/account/favorites/${kind}/${encodeURIComponent(refId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---------- Fan Wall ----------
export interface WallPost {
  id: string;
  name: string;
  body: string;
  image: string | null;
  likes: number;
  likedByMe: boolean;
  createdAt: string;
}
export async function getWall(token?: string | null): Promise<WallPost[]> {
  try {
    const res = await fetch(`${API_URL}/wall`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as WallPost[];
  } catch {
    return [];
  }
}
export async function createWallPost(
  token: string,
  data: { body: string; photo?: File | null }
): Promise<WallPost> {
  const fd = new FormData();
  fd.append("body", data.body);
  if (data.photo) fd.append("photo", data.photo);
  const res = await fetch(`${API_URL}/wall`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return handle(res);
}
export async function likeWallPost(
  token: string,
  id: string
): Promise<{ likes: number; likedByMe: boolean }> {
  const res = await fetch(`${API_URL}/wall/${id}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}
export async function loginFan(payload: {
  email: string;
  password: string;
}): Promise<{ token: string; user: FanUser }> {
  const res = await fetch(`${API_URL}/account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res);
}
export async function getFanMe(token: string): Promise<FanUser | null> {
  try {
    const res = await fetch(`${API_URL}/account/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as { user: FanUser }).user;
  } catch {
    return null;
  }
}
export const getBeats = (featured = false) =>
  safeGet<Beat[]>(`/beats${featured ? "?featured=true" : ""}`, []);
export const getMerch = (featured = false) =>
  safeGet<Merch[]>(`/merch${featured ? "?featured=true" : ""}`, []);
export const getMerchItem = (slug: string) => safeGet<Merch | null>(`/merch/${slug}`, null);

// ---------- Models (booking) ----------
export interface ModelProfileItem {
  id: string;
  name: string;
  slug: string;
  photos: string[];
  bio: string | null;
  rateGhs: number;
  isFeatured: boolean;
}
export const getModels = (featured = false) =>
  safeGet<ModelProfileItem[]>(`/models${featured ? "?featured=true" : ""}`, []);
export const getModelItem = (slug: string) =>
  safeGet<ModelProfileItem | null>(`/models/${slug}`, null);

export async function submitBooking(payload: {
  modelId: string;
  clientName: string;
  email: string;
  phone?: string;
  date?: string;
  eventType?: string;
  budget?: string;
  message?: string;
}): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_URL}/models/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

// ---------- Content submissions (fan/creator/model uploads → admin review) ----------
export interface MySubmissions {
  videos: { id: string; title: string; category: string; status: string; createdAt: string }[];
  models: { id: string; name: string; status: string; createdAt: string }[];
}
export async function submitVideoContent(
  token: string,
  data: {
    title: string;
    category: "fan" | "creator";
    description?: string;
    videoFile: File;
    poster?: File | null;
  }
): Promise<{ ok: boolean; status: string }> {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("category", data.category);
  if (data.description) fd.append("description", data.description);
  fd.append("videoFile", data.videoFile);
  if (data.poster) fd.append("poster", data.poster);
  const res = await fetch(`${API_URL}/account/submissions/video`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return handle(res);
}
export async function submitModelContent(
  token: string,
  data: { name: string; rateGhs?: string; bio?: string; photos: File[] }
): Promise<{ ok: boolean; status: string }> {
  const fd = new FormData();
  fd.append("name", data.name);
  if (data.rateGhs) fd.append("rateGhs", data.rateGhs);
  if (data.bio) fd.append("bio", data.bio);
  data.photos.forEach((p) => fd.append("photos", p));
  const res = await fetch(`${API_URL}/account/submissions/model`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return handle(res);
}
export async function getMySubmissions(token: string): Promise<MySubmissions> {
  try {
    const res = await fetch(`${API_URL}/account/submissions/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { videos: [], models: [] };
    return (await res.json()) as MySubmissions;
  } catch {
    return { videos: [], models: [] };
  }
}

// ---------- Inquiries ----------
export async function submitInquiry(payload: Record<string, unknown>): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_URL}/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

// ---------- Checkout ----------
export async function initializeCheckout(payload: {
  email: string;
  name?: string;
  items: CartLine[];
}): Promise<{ authorizationUrl: string; reference: string; totalGhs: number }> {
  const res = await fetch(`${API_URL}/checkout/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function verifyCheckout(reference: string): Promise<OrderSummary> {
  const res = await fetch(`${API_URL}/checkout/verify?reference=${encodeURIComponent(reference)}`, {
    cache: "no-store",
  });
  return handle(res);
}

// ---------- Donations ----------
export async function initializeDonation(payload: {
  email: string;
  name?: string;
  amountGhs: number;
  message?: string;
}): Promise<{ authorizationUrl: string; reference: string; amountGhs: number }> {
  const res = await fetch(`${API_URL}/donate/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function verifyDonation(
  reference: string
): Promise<{ reference: string; status: string; amountGhs: number; name: string | null }> {
  const res = await fetch(`${API_URL}/donate/verify?reference=${encodeURIComponent(reference)}`, {
    cache: "no-store",
  });
  return handle(res);
}
