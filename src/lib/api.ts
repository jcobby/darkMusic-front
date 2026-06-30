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
export const getBeats = (featured = false) =>
  safeGet<Beat[]>(`/beats${featured ? "?featured=true" : ""}`, []);
export const getMerch = (featured = false) =>
  safeGet<Merch[]>(`/merch${featured ? "?featured=true" : ""}`, []);
export const getMerchItem = (slug: string) => safeGet<Merch | null>(`/merch/${slug}`, null);

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
