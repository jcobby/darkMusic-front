import type { BallState as PoolBall, Frame as PoolFrame, Outcome as PoolOutcome, Shot as PoolShot } from "./pool/engine";
import { deviceHeader } from "./device";

// A relative API URL ("/api") goes through this site's own server (next.config rewrites) —
// e.g. behind a dev tunnel. Pages rendered on the server call the backend directly.
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_URL =
  PUBLIC_API_URL.startsWith("/") && typeof window === "undefined"
    ? `${(process.env.API_PROXY_TARGET || "http://localhost:5000").replace(/\/+$/, "")}${PUBLIC_API_URL}`
    : PUBLIC_API_URL;

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
  /** "shop" = fixed-price store; "worn" = Worn on Set auction piece. */
  kind: "shop" | "worn";
  /** Where the item lives: /merch/… or /worn-on-set/… */
  path: string;
  description: string | null;
  condition: string | null;
  wornIn: string | null;
  images: string[];
  category: string;
  priceGhs: number;
  sizes: string[];
  stock: number;
  isLimited: boolean;
  isSigned: boolean;
  isFeatured: boolean;
  inStock: boolean;
  /** Set when the item is sold by auction instead of at a fixed price. */
  auction: MerchAuction | null;
}

export interface MerchAuction {
  status: "live" | "ended" | "sold" | "unsold";
  startingBidGhs: number;
  minIncrementGhs: number;
  /** null until the first bid starts the clock */
  endsAt: string | null;
  /** Open for bids but nobody has bid yet — the countdown hasn't started. */
  awaitingFirstBid: boolean;
  /** How long the countdown runs once the first bid is in (14). */
  runDays: number;
  payWindowHours: number;
  payBy: string | null; // the current winner's payment deadline
  highBidGhs: number | null;
  leader: string | null; // "Kwame M."
  bidCount: number;
  minNextBidGhs: number;
}

export interface OrderSummary {
  reference: string;
  status: "pending" | "paid" | "failed";
  totalGhs: number;
  auction?: boolean; // paid for a won merch auction (not the cart)
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

/**
 * Public catalogue reads are cached on the server for `revalidate` seconds:
 * pages are served instantly from cache and refreshed in the background, so a
 * slow or sleeping backend never makes a visitor wait. Browser-side calls
 * always fetch fresh.
 */
const publicRead = (revalidate = 60): RequestInit =>
  typeof window === "undefined" ? { next: { revalidate } } : { cache: "no-store" };

/** Server-safe GET of public data that returns a fallback instead of throwing (for listings). */
async function safeGet<T>(path: string, fallback: T, revalidate?: number): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, publicRead(revalidate));
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
    // Signed-in calls carry the fan's own rating/vote, so they're never cached.
    const res = await fetch(
      `${API_URL}/videos?category=${category}`,
      token ? { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" } : publicRead()
    );
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
// Headlines change slowly — cache for 10 minutes.
export const getNews = () =>
  safeGet<NewsData>(`/news`, { updatedAt: "", news: [], hiphop: [], releases: [] }, 600);

// ---------- Fan accounts ----------
export interface FanUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerified: boolean;
  points: number;
  streak: number;
  bestStreak: number; // longest check-in streak — their Lenko Army rank
  lastCheckIn: string | null;
  nameColor: NameColor | null;
  referralCode: string;
  streamUntil: string | null;
  member?: { tier: MemberTier; until: string } | null; // a DMY membership that's running
  cueDesign?: CueDesign; // their Pool cue
}

// ---------- DMY membership (Supporter / VIP / Legend — a month at a time) ----------
export type MemberTier = "supporter" | "vip" | "legend";
export type CueDesign = "classic" | "gold" | "neon" | "lenko" | "diamond";
export interface MembershipPlans {
  days: number;
  tiers: { key: MemberTier; label: string; badge: string; priceGhs: number; perks: string[] }[];
  cues: { key: CueDesign; label: string; tier: MemberTier | null }[];
}
export interface MyMembership {
  tier: MemberTier | null;
  until: string | null;
  cue: CueDesign;
}
export const getMembershipPlans = () => safeGet<MembershipPlans | null>("/membership", null, 300);
export async function getMyMembership(token: string): Promise<MembershipPlans & { membership: MyMembership }> {
  return handle(await fetch(`${API_URL}/account/membership`, { headers: authJson(token), cache: "no-store" }));
}
/** Pay for a month (Mobile Money or card) — returns the Paystack link. */
export async function startMembership(token: string, tier: MemberTier): Promise<{ authorizationUrl: string; reference: string; amountGhs: number }> {
  return handle(await fetch(`${API_URL}/account/membership/initialize`, { method: "POST", headers: authJson(token), body: JSON.stringify({ tier }) }));
}
export async function verifyMembership(token: string, reference: string): Promise<{ status: string; tier: MemberTier; membership: MyMembership | null }> {
  return handle(await fetch(`${API_URL}/account/membership/verify?reference=${encodeURIComponent(reference)}`, { headers: authJson(token), cache: "no-store" }));
}
export async function setCueDesign(token: string, design: CueDesign): Promise<MyMembership> {
  return handle(await fetch(`${API_URL}/account/cue`, { method: "PUT", headers: authJson(token), body: JSON.stringify({ design }) }));
}
/** This month's Supporter Wall: members by tier, and donors who said yes. */
export interface SupporterWall {
  month: string;
  legends: string[];
  vips: string[];
  supporters: string[];
  donors: string[];
}
export const getSupporterWall = () => safeGet<SupporterWall | null>("/supporters/wall", null, 60);

// ---------- Lenko Army promoter program (darkmusicyard.com/r/<code>) ----------
export interface PromoTier {
  clicks: number;
  ghs: number;
}
export interface PromoInfo {
  open: boolean;
  target: string; // one of the YouTube links below, picked for this visit
  targets?: string[]; // where links go: each visit goes to one of these
  tiers: PromoTier[];
}
export interface PromoterView {
  program: { open: boolean; tiers: PromoTier[]; smsReady: boolean; ipDailyCap: number };
  code: string;
  profilePhone: string | null;
  promoter: {
    phone: string;
    status: "active" | "disqualified";
    reason: string | null;
    momo: { network: MomoNetwork; number: string; accountName: string } | null;
    verifiedAt: string;
  } | null;
  month: { month: string; clicks: number; endsAt: string };
  history: { month: string; clicks: number; rewardGhs: number; paidAt: string | null }[];
  pendingCode: { phone: string; expiresAt: string } | null;
}
export type MomoNetwork = "MTN" | "Telecel" | "AirtelTigo";
export const getPromoInfo = () => safeGet<PromoInfo | null>("/promo", null, 120);
const promoterHeaders = (token: string) => ({ ...authJson(token), ...deviceHeader() });
export async function getPromoter(token: string): Promise<PromoterView> {
  return handle(await fetch(`${API_URL}/account/promoter`, { headers: promoterHeaders(token), cache: "no-store" }));
}
export async function sendPromoterCode(token: string, phone: string): Promise<PromoterView> {
  return handle(await fetch(`${API_URL}/account/promoter/code`, { method: "POST", headers: promoterHeaders(token), body: JSON.stringify({ phone }) }));
}
export async function verifyPromoterCode(token: string, code: string): Promise<PromoterView> {
  return handle(await fetch(`${API_URL}/account/promoter/verify`, { method: "POST", headers: promoterHeaders(token), body: JSON.stringify({ code }) }));
}
export async function setPromoterPayout(token: string, momo: { network: MomoNetwork; number: string; accountName: string }): Promise<PromoterView> {
  return handle(await fetch(`${API_URL}/account/promoter/payout`, { method: "PUT", headers: promoterHeaders(token), body: JSON.stringify(momo) }));
}
/** Count a visit to a member's link (fire-and-forget; it keeps going while the page moves to YouTube). */
export function sendPromoClick(code: string, vid: string | null, token: string | null) {
  return fetch(`${API_URL}/promo/click`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ code, vid }),
  });
}

// ---------- Lenko Army flair (rank, badges, name colour) ----------
export type NameColor = "purple" | "emerald" | "gold" | "sky" | "rose" | "ice";
/** Shown next to a fan's name on the boards. */
export interface Flair {
  rank: string;
  color: NameColor | null;
  streak: number; // live check-in streak (0 once broken)
  months: number; // Beat Breaker months won
  weeks: number; // weekly boards topped
  events: number; // events won (weekly challenges, live tournaments)
  sprints: number; // daily sprint boards topped
  squad: string | null; // their squad's tag
  trivia: number; // Lenko Trivia questions got right
  member?: MemberTier | null; // 💜 Supporter, 💎 VIP, 👑 Legend
}
/** Everything the account page shows about a fan's flair. */
export interface MyFlair {
  flair: Flair;
  rank: { index: number; name: string };
  next: { name: string; days: number; bonus: number } | null;
  ranks: { name: string; days: number }[];
  streak: number;
  bestStreak: number;
  checkIn: { done: boolean; points: number; tiers: { fromDay: number; points: number }[] };
  colors: { key: NameColor; label: string; unlock: string; unlocked: boolean }[];
}
export async function getMyFlair(token: string): Promise<MyFlair | null> {
  try {
    const res = await fetch(`${API_URL}/account/flair`, { headers: authJson(token), cache: "no-store" });
    return res.ok ? ((await res.json()) as MyFlair) : null;
  } catch {
    return null;
  }
}
export async function setNameColor(token: string, nameColor: NameColor | null): Promise<MyFlair> {
  return handle(await fetch(`${API_URL}/account/flair`, { method: "PUT", headers: authJson(token), body: JSON.stringify({ nameColor }) }));
}
export async function registerFan(payload: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  ref?: string;
}): Promise<{ token: string; user: FanUser }> {
  const res = await fetch(`${API_URL}/account/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...deviceHeader() },
    body: JSON.stringify(payload),
  });
  return handle(res);
}
/** A daily check-in: points (they grow with the streak) plus any promotion bonus. */
export interface CheckInResult {
  awarded: number; // everything credited, bonus included
  bonus: number; // for a new Lenko Army rank
  promoted: string | null; // the new rank
  alreadyCheckedIn: boolean;
  streak: number;
  tomorrow?: number; // what tomorrow's check-in pays, if they keep it going
  user: FanUser;
}
export async function checkInFan(token: string): Promise<CheckInResult> {
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
  mine: boolean;
  createdAt: string;
}
export async function deleteWallPost(token: string, id: string): Promise<void> {
  await fetch(`${API_URL}/wall/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
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
    headers: { "Content-Type": "application/json", ...deviceHeader() },
    body: JSON.stringify(payload),
  });
  return handle(res);
}
/**
 * The signed-in fan, or null when the sign-in is no longer valid. Throws when the
 * server can't be reached (or is still waking up), so a bad connection doesn't
 * sign anyone out.
 */
export async function getFanMe(token: string): Promise<FanUser | null> {
  const res = await fetch(`${API_URL}/account/me`, {
    headers: { Authorization: `Bearer ${token}`, ...deviceHeader() },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Account check failed: ${res.status}`);
  return ((await res.json()) as { user: FanUser }).user;
}
export const getBeats = (featured = false) =>
  safeGet<Beat[]>(`/beats${featured ? "?featured=true" : ""}`, []);
export const getMerch = (featured = false) =>
  safeGet<Merch[]>(`/merch${featured ? "?featured=true" : ""}`, []);
export const getMerchItem = (slug: string) => safeGet<Merch | null>(`/merch/${slug}`, null);
/** Worn on Set auction pieces — live ones first. */
export const getWornItems = () => safeGet<Merch[]>(`/worn`, [], 30);

// ---------- Merch auctions ----------
export interface AuctionState {
  auction: MerchAuction | null;
  bids: { name: string; amountGhs: number; at: string; mine: boolean }[];
  you: {
    leading: boolean;
    won: boolean;
    paid: boolean;
    lapsed: boolean; // won but didn't pay in time
    payBy: string | null;
    myBestBidGhs: number | null;
    size: string | null;
  } | null;
}
/** Live auction state — always fresh; pass the fan's token to see their own position. */
export async function getAuction(slug: string, token?: string | null): Promise<AuctionState> {
  const res = await fetch(`${API_URL}/merch/${slug}/auction`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  return handle(res);
}
export async function placeBid(
  token: string,
  slug: string,
  amountGhs: number,
  size?: string
): Promise<AuctionState> {
  const res = await fetch(`${API_URL}/merch/${slug}/bids`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amountGhs, size }),
  });
  return handle(res);
}
/** The winner pays their bid — returns the Paystack checkout URL. */
export async function payAuction(
  token: string,
  slug: string
): Promise<{ authorizationUrl: string; reference: string; amountGhs: number }> {
  const res = await fetch(`${API_URL}/merch/${slug}/auction/pay`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}
export interface MyBid {
  slug: string;
  path: string;
  name: string;
  image: string | null;
  myBestBidGhs: number;
  highBidGhs: number | null;
  endsAt: string;
  payBy: string | null;
  status: "leading" | "outbid" | "won" | "lost" | "paid" | "lapsed";
}
export async function getMyBids(token: string): Promise<MyBid[]> {
  try {
    const res = await fetch(`${API_URL}/account/bids`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as MyBid[]) : [];
  } catch {
    return [];
  }
}

// ---------- Behind-the-scenes gallery ----------
export interface GalleryItem {
  id: string;
  src: string;
  caption: string | null;
  shoot: string | null;
}
export const getGallery = () => safeGet<GalleryItem[]>(`/gallery`, [], 300);

// ---------- Models (booking marketplace) ----------
export interface ModelProfileItem {
  id: string;
  name: string;
  slug: string;
  photos: string[];
  video: string | null;
  bio: string | null;
  isFeatured: boolean;
  location: string | null;
  height: string | null;
  experience: string | null;
  categories: string[];
  languages: string[];
  rateGhs: number; // starting rate
  availability: string | null;
  instagram: string | null;
  tiktok: string | null;
  rating: { avg: number; count: number } | null;
}
export interface ModelReview {
  stars: number;
  comment: string | null;
  name: string;
  date: string;
}
/** Fill marketplace fields an older API (or an older profile) may not send. */
function withModelDefaults<T extends Partial<ModelProfileItem>>(m: T) {
  return {
    ...m,
    photos: m.photos ?? [],
    video: m.video ?? null,
    location: m.location ?? null,
    height: m.height ?? null,
    experience: m.experience ?? null,
    categories: m.categories ?? [],
    languages: m.languages ?? [],
    rateGhs: m.rateGhs ?? 2000,
    availability: m.availability ?? null,
    instagram: m.instagram ?? null,
    tiktok: m.tiktok ?? null,
    rating: m.rating ?? null,
  };
}
export const getModels = async (featured = false): Promise<ModelProfileItem[]> =>
  (await safeGet<ModelProfileItem[]>(`/models${featured ? "?featured=true" : ""}`, [])).map(
    (m) => withModelDefaults(m) as ModelProfileItem
  );
export const getModelItem = async (slug: string) => {
  const m = await safeGet<(ModelProfileItem & { reviews?: ModelReview[] }) | null>(`/models/${slug}`, null);
  return m ? { ...(withModelDefaults(m) as ModelProfileItem), reviews: m.reviews ?? [] } : null;
};

export interface BookingRequest {
  modelId: string;
  clientName: string;
  phone: string;
  date: string;
  time: string;
  location: string;
  eventType: string;
  durationHours: number;
  modelsCount: number;
  message?: string;
  offerGhs: number;
}
export async function submitBooking(token: string, payload: BookingRequest): Promise<{ ok: boolean; id: string }> {
  const res = await fetch(`${API_URL}/models/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

/** Fields both sides see on a booking. */
interface BookingBase {
  id: string;
  status: string;
  date: string | null;
  time: string | null;
  location: string | null;
  shootType: string | null;
  durationHours: number | null;
  modelsCount: number;
  requirements: string | null;
  offerGhs: number | null;
  priceGhs: number | null;
  declineReason: string | null;
  cancelledBy: "customer" | "model" | "admin" | null;
  review: { stars: number; comment: string | null } | null;
  createdAt: string;
}
/** A booking from the customer's side (model contact unlocks after payment). */
export interface CustomerBooking extends BookingBase {
  model: { name: string; slug: string | null; photo: string | null };
  contact: { email: string | null; phone: string | null } | null;
}
/** A booking from the model's side (customer contact unlocks after payment). */
export interface ModelSideBooking extends BookingBase {
  customerName: string;
  customer: { name: string; email: string; phone: string | null } | null;
  commissionGhs: number | null;
  payoutGhs: number | null;
  payoutStatus: "unpaid" | "paid";
}

const authJson = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export async function getMyBookings(token: string): Promise<CustomerBooking[]> {
  try {
    const res = await fetch(`${API_URL}/account/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as CustomerBooking[]) : [];
  } catch {
    return [];
  }
}
export async function payBooking(
  token: string,
  id: string
): Promise<{ authorizationUrl: string; reference: string; amountGhs: number }> {
  const res = await fetch(`${API_URL}/account/bookings/${id}/pay`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}
export async function verifyBookingPayment(token: string, reference: string): Promise<CustomerBooking> {
  const res = await fetch(
    `${API_URL}/account/bookings/verify?reference=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  return handle(res);
}
export async function cancelBooking(token: string, id: string): Promise<CustomerBooking> {
  const res = await fetch(`${API_URL}/account/bookings/${id}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}
export async function reviewBooking(
  token: string,
  id: string,
  stars: number,
  comment?: string
): Promise<CustomerBooking> {
  const res = await fetch(`${API_URL}/account/bookings/${id}/review`, {
    method: "POST",
    headers: authJson(token),
    body: JSON.stringify({ stars, comment }),
  });
  return handle(res);
}

/** The model's own profile (public fields + private ones only DMY sees). */
export interface MyModelProfile extends ModelProfileItem {
  status: "pending" | "approved" | "rejected";
  hidden: boolean;
  legalName: string | null;
  phone: string | null;
  email: string | null;
  age: number | null;
  weight: string | null;
}
export interface MyModelData {
  profile: MyModelProfile | null;
  bookings: ModelSideBooking[];
  earnings: { dueGhs: number; paidOutGhs: number; commissionRate: number } | null;
}
export async function getMyModel(token: string): Promise<MyModelData> {
  try {
    const res = await fetch(`${API_URL}/account/model`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as MyModelData;
  } catch {
    /* fall through */
  }
  return { profile: null, bookings: [], earnings: null };
}
export async function updateMyModel(
  token: string,
  data: Partial<{
    phone: string;
    location: string;
    height: string;
    weight: string;
    experience: string;
    bio: string;
    availability: string;
    categories: string[];
    languages: string[];
    rateGhs: number;
    instagram: string;
    tiktok: string;
  }>
): Promise<MyModelProfile> {
  const res = await fetch(`${API_URL}/account/model`, {
    method: "PATCH",
    headers: authJson(token),
    body: JSON.stringify(data),
  });
  return handle(res);
}
export async function respondToBooking(
  token: string,
  id: string,
  action: "accept" | "decline" | "complete",
  extra: { priceGhs?: number; reason?: string } = {}
): Promise<ModelSideBooking> {
  const res = await fetch(`${API_URL}/account/model/bookings/${id}`, {
    method: "PATCH",
    headers: authJson(token),
    body: JSON.stringify({ action, ...extra }),
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
export interface ModelRegistration {
  name: string;
  legalName: string;
  phone: string;
  email: string;
  location: string;
  age: string;
  height: string;
  weight: string;
  experience: string;
  bio: string;
  categories: string[];
  languages: string;
  rateGhs: string;
  availability: string;
  instagram: string;
  tiktok: string;
  agree: string[];
  photos: File[];
  video: File | null;
}
export async function submitModelContent(
  token: string,
  data: ModelRegistration
): Promise<{ ok: boolean; status: string }> {
  const fd = new FormData();
  const { categories, agree, photos, video, ...text } = data;
  Object.entries(text).forEach(([k, v]) => {
    if (v.trim()) fd.append(k, v.trim());
  });
  categories.forEach((c) => fd.append("categories", c));
  agree.forEach((a) => fd.append("agree", a));
  photos.forEach((p) => fd.append("photos", p));
  if (video) fd.append("video", video);
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
  showOnWall?: boolean; // their name on this month's Supporter Wall
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

// ---------- Social proof ----------
/** How many different fans paid something this month (tips, downloads, merch, tickets). */
export async function getSupporters(): Promise<number | null> {
  try {
    const res = await fetch(`${API_URL}/supporters`, publicRead(300));
    return res.ok ? ((await res.json()) as { thisMonth: number }).thisMonth : null;
  } catch {
    return null;
  }
}

// ---------- Monthly game prize (Beat Breaker) ----------
export interface LeaderboardRow {
  rank: number;
  name: string;
  /** The month's or week's total (daily rules) — or the best single game (earlier months). */
  score: number;
  level: number;
  /** Daily rules: days played and the best single game. */
  days: number | null;
  bestRun: number | null;
  /** Their Lenko Army rank, badges and name colour. */
  flair: Flair | null;
  mine: boolean;
}
/** How a daily-rules board adds up (see the backend's services/gameScoring). */
export interface BoardScoring {
  bestDays: number; // the month counts this many of a player's best days
  streakStepPct: number; // each day in a row adds this much to the day's score…
  streakMaxPct: number; // …up to this
  weeklyFrom: string; // the first weekly board (a Monday)
}
/** The signed-in fan's day: played → today's best and streak; not yet → the streak they'd carry on and today's bonus. */
export interface BoardToday {
  played: boolean;
  best: number;
  points: number;
  streak: number;
  bonusPct: number;
}
export interface Leaderboard {
  game: string;
  period: "month" | "week" | "sprint";
  month: string; // YYYY-MM (a week: the month of its Monday)
  week?: string; // a week's Monday, YYYY-MM-DD
  day?: string; // a sprint board's day, YYYY-MM-DD
  sprintMinutes?: number;
  /** "daily": the best days add up (November 2026 on) · "best": the best single game counts */
  rules: "daily" | "best";
  scoring: BoardScoring | null;
  /** What's deposited in the month's prize pool (the announced amount until DMY deposits). 0 for a week. */
  prizeGhs: number;
  /** DMY has paid money into the pool. */
  funded: boolean;
  startsAt: string;
  endsAt: string;
  ended: boolean;
  /** Players on the board. */
  total: number;
  offset: number;
  leader: LeaderboardRow | null;
  /** This page of the board (`offset` + 1 onwards). */
  top: LeaderboardRow[];
  /** The signed-in fan: their rank and the players just above and below them. */
  me: {
    rank: number | null;
    score: number;
    level: number;
    days: number | null;
    bestRun: number | null;
    disqualified: boolean;
    around: LeaderboardRow[];
  } | null;
  /** Finished months only: the prize credited to the winner's wallet. */
  prize: { amountGhs: number; inReview: boolean; availableAt: string | null } | null;
  /** Daily rules, signed in, still running: their day so far and their streak. */
  today: BoardToday | null;
}

export async function getLeaderboard(
  game: string,
  token?: string | null,
  opts: { month?: string; week?: string; sprint?: string; offset?: number; limit?: number } = {}
): Promise<Leaderboard | null> {
  const q = new URLSearchParams();
  if (opts.sprint) q.set("sprint", opts.sprint);
  else if (opts.week) q.set("week", opts.week);
  else if (opts.month) q.set("month", opts.month);
  if (opts.offset) q.set("offset", String(opts.offset));
  if (opts.limit) q.set("limit", String(opts.limit));
  const qs = q.toString();
  try {
    const res = await fetch(`${API_URL}/games/${game}/leaderboard${qs ? `?${qs}` : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as Leaderboard) : null;
  } catch {
    return null;
  }
}

// ---------- DMY Pool ----------
export type { PoolBall, PoolFrame, PoolOutcome, PoolShot };
/** A match as the page sees it (the table itself is lib/pool/engine's Frame). */
export interface PoolMatchView {
  code: string;
  ranked: boolean;
  bestOf: 1 | 3 | 5;
  status: "waiting" | "playing" | "finished" | "cancelled";
  players: { name: string; rating: number; flair: Flair | null }[];
  /** The two players' record against each other, all time (in the players' order). */
  headToHead: { wins: number[]; frames: number[]; matches: number; since: string | null } | null;
  me: 0 | 1 | null; // which player you are (null: watching)
  frames: [number, number];
  frameNo: number;
  frame: PoolFrame | null;
  shotNo: number;
  lastShot: PoolShotRecord | null;
  turnEndsAt: string | null;
  turnSeconds: number;
  now: string; // the server's clock
  winner: 0 | 1 | null;
  reason: string | null;
  ratingChange: [number, number] | null;
  expiresAt: string | null; // a challenge waiting for a friend
}
export interface PoolShotRecord {
  no: number;
  by: 0 | 1;
  frameNo: number;
  timeout?: boolean;
  shot?: PoolShot;
  cue?: { x: number; y: number };
  start?: PoolBall[];
  outcome?: PoolOutcome;
}
export interface PoolMe {
  rating: number;
  wins: number;
  losses: number;
  rank: number | null;
  active: { code: string; status: string; ranked: boolean } | null;
  queue: PoolQueueState;
}
export type PoolQueueState = { status: "idle"; waiting: number } | { status: "searching"; since: string; waiting: number } | { status: "matched"; code: string };
export interface PoolLadder {
  total: number;
  top: { rank: number; name: string; rating: number; wins: number; losses: number; flair: Flair | null; mine: boolean }[];
  me: { rank: number; rating: number; wins: number; losses: number } | null;
}
const poolCall = async <T,>(method: string, path: string, token: string | null, body?: unknown) =>
  handle<T>(
    await fetch(`${API_URL}/pool${path}`, {
      method,
      headers: token ? authJson(token) : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    })
  );
export const getPoolMe = (token: string) => poolCall<PoolMe>("GET", "/me", token);
export const joinPoolQueue = (token: string) => poolCall<PoolQueueState>("POST", "/queue", token);
export const checkPoolQueue = (token: string) => poolCall<PoolQueueState>("GET", "/queue", token);
export const leavePoolQueue = (token: string) => poolCall<PoolQueueState>("DELETE", "/queue", token);
export const createPoolChallenge = (token: string, bestOf: 1 | 3 | 5) => poolCall<PoolMatchView>("POST", "/challenges", token, { bestOf });
export const getPoolMatch = (code: string, token: string | null) => poolCall<PoolMatchView>("GET", `/matches/${encodeURIComponent(code)}`, token);
export const acceptPoolChallenge = (token: string, code: string) => poolCall<PoolMatchView>("POST", `/matches/${encodeURIComponent(code)}/accept`, token);
export const takePoolShot = (token: string, code: string, body: { shotNo: number; dx: number; dy: number; power: number; cue?: { x: number; y: number } }) =>
  poolCall<PoolMatchView>("POST", `/matches/${encodeURIComponent(code)}/shot`, token, body);
export const concedePool = (token: string, code: string) => poolCall<PoolMatchView>("POST", `/matches/${encodeURIComponent(code)}/concede`, token);
export const getPoolLadder = (token: string | null) => poolCall<PoolLadder>("GET", "/ladder", token);

/** DMY Pool Night (Thursdays from 7pm): tonight's or the next one, and how busy the tables are. */
export interface PoolNight {
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "live" | "cancelled";
  slug: string | null; // the night's event page (its board of ranked wins)
  prizeGhs: number;
  looking: number; // in the ranked queue right now
  playing: number; // matches being played right now
  players: number; // have played a ranked match tonight
  now: string; // the server's clock
}
export const getPoolNight = () => poolCall<PoolNight>("GET", "/night", null);

// ---------- Squads ----------
export interface MySquad {
  id: string;
  name: string;
  tag: string;
  code: string; // invite code
  captain: boolean; // you're the captain
  score: number; // members' month totals added up
  ranked: boolean; // has enough members for the board
  members: { userId: string; name: string; captain: boolean; me: boolean; score: number }[];
}
export interface SquadBoard {
  month: string;
  endsAt: string;
  ended: boolean;
  min: number;
  max: number;
  board: { rank: number; id: string; name: string; tag: string; members: number; score: number }[];
  mine: MySquad | null;
  freeAt: string | null; // left a squad recently: can join another from then
}
export async function getSquads(token: string | null, month?: string): Promise<SquadBoard | null> {
  try {
    const res = await fetch(`${API_URL}/squads${month ? `?month=${month}` : ""}`, { headers: token ? authJson(token) : {}, cache: "no-store" });
    return res.ok ? ((await res.json()) as SquadBoard) : null;
  } catch {
    return null;
  }
}
export async function getSquadInvite(code: string): Promise<{ name: string; tag: string; members: number; full: boolean } | null> {
  try {
    const res = await fetch(`${API_URL}/squads/invite/${encodeURIComponent(code)}`, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
const squadPost = async <T,>(token: string, path: string, body: unknown = {}) =>
  handle<T>(await fetch(`${API_URL}/squads${path}`, { method: "POST", headers: authJson(token), body: JSON.stringify(body) }));
export const createSquad = (token: string, name: string, tag: string) => squadPost<MySquad>(token, "", { name, tag });
export const joinSquad = (token: string, code: string) => squadPost<MySquad>(token, "/join", { code });
export const leaveSquad = (token: string) => squadPost<{ ok: boolean }>(token, "/leave");
export const removeFromSquad = (token: string, userId: string) => squadPost<MySquad>(token, "/remove", { userId });

// ---------- Beat of the Day ----------
/** One DMY free beat featured each day: it plays first in the games, and in Beat Breaker its kicks score `multiplier`× instead of 2×. */
export interface BeatOfTheDay {
  day: string;
  multiplier: number;
  beat: Beat | null;
}
export const getBeatOfTheDay = () => safeGet<BeatOfTheDay | null>("/beat-of-the-day", null, 60);

// ---------- Game events (weekly challenges, live tournaments) ----------
export interface GameEventInfo {
  slug: string;
  title: string;
  description: string | null;
  game: string;
  kind: "weekly" | "live";
  /** best: the highest single game · days: the best game each day added up · wins: ranked Pool wins */
  metric: "best" | "days" | "wins";
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "live" | "ended" | "cancelled";
  prizeGhs: number;
  /** What each paid place wins: [1st, 2nd, …] */
  prizes: number[];
  winners: { place: number; name: string; score: number; amountGhs: number }[];
  players?: number;
}
export interface GameEventsList {
  live: GameEventInfo[];
  upcoming: GameEventInfo[];
  recent: GameEventInfo[];
}
export async function getGameEvents(game = "beat-breaker"): Promise<GameEventsList> {
  try {
    const res = await fetch(`${API_URL}/events?game=${game}`, { cache: "no-store" });
    if (res.ok) return (await res.json()) as GameEventsList;
  } catch {
    /* offline — no events shown */
  }
  return { live: [], upcoming: [], recent: [] };
}
/** An event and its board (rows as on the other boards). */
export interface GameEventBoard extends Pick<Leaderboard, "total" | "offset" | "leader" | "top" | "me"> {
  event: GameEventInfo;
}
export async function getGameEvent(
  slug: string,
  token?: string | null,
  opts: { offset?: number; limit?: number; revalidate?: number } = {}
): Promise<GameEventBoard | null> {
  const q = new URLSearchParams();
  if (opts.offset) q.set("offset", String(opts.offset));
  if (opts.limit) q.set("limit", String(opts.limit));
  try {
    const qs = q.toString();
    const res = await fetch(`${API_URL}/events/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      ...(opts.revalidate ? { next: { revalidate: opts.revalidate } } : { cache: "no-store" as const }),
    });
    return res.ok ? ((await res.json()) as GameEventBoard) : null;
  } catch {
    return null;
  }
}

// ---------- Prize pool and wallet ----------

/** The month's prize pool — every deposit DMY has paid in — plus past winners. */
export interface PrizePool {
  month: string;
  endsAt: string;
  reviewHours: number;
  pool: {
    prizeGhs: number;
    depositedGhs: number;
    funded: boolean;
    announcedGhs: number;
    deposits: { amountGhs: number; paidAt: string; ref: string }[];
  };
  /** checking: score check · in_wallet: waiting to be withdrawn · withdrawing · paid */
  winners: { month: string; name: string; score: number | null; amountGhs: number; status: "checking" | "in_wallet" | "withdrawing" | "paid"; availableAt: string | null }[];
  totalPaidOutGhs: number;
}
/** For server pages: the prize pool and past winners (the Hall of Fame), or null. */
export const getPrizePoolSafe = (game: string) => safeGet<PrizePool | null>(`/games/${game}/prize`, null, 300);

/** This month's best single game — the Brick Challenge banner's score to beat. */
export interface GameRecord {
  month: string;
  best: { score: number; name: string } | null;
  players: number;
}
export const getGameRecord = (game = "beat-breaker") => safeGet<GameRecord | null>(`/games/${game}/record`, null, 60);

export async function getPrizePool(game: string, month?: string): Promise<PrizePool | null> {
  try {
    const res = await fetch(`${API_URL}/games/${game}/prize${month ? `?month=${month}` : ""}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as PrizePool) : null;
  } catch {
    return null;
  }
}

export const MOMO_NETWORKS = ["MTN", "Telecel", "AirtelTigo"] as const;
export interface WalletTxn {
  id: string;
  kind: "prize" | "withdrawal";
  amountGhs: number;
  /** prize: review | available · withdrawal: requested | sending | otp | paid | failed | rejected | cancelled */
  status: string;
  month: string | null;
  score: number | null;
  availableAt: string | null;
  momo: { network: string; number: string; accountName: string } | null;
  note: string | null;
  failure: string | null;
  paidAt: string | null;
  createdAt: string;
}
export interface Wallet {
  availableGhs: number;
  inReviewGhs: number;
  withdrawnGhs: number;
  reviewHours: number;
  txns: WalletTxn[];
}
export async function getWallet(token: string): Promise<Wallet | null> {
  try {
    const res = await fetch(`${API_URL}/wallet`, { headers: authJson(token), cache: "no-store" });
    return res.ok ? ((await res.json()) as Wallet) : null;
  } catch {
    return null;
  }
}
export async function requestWithdrawal(
  token: string,
  body: { network: string; number: string; accountName: string }
): Promise<WalletTxn> {
  const res = await fetch(`${API_URL}/wallet/withdraw`, { method: "POST", headers: authJson(token), body: JSON.stringify(body) });
  return handle(res);
}
export async function cancelWithdrawal(token: string, id: string): Promise<WalletTxn> {
  const res = await fetch(`${API_URL}/wallet/withdrawals/${id}/cancel`, { method: "POST", headers: authJson(token) });
  return handle(res);
}
/**
 * Start a run — the token proves when it began. Signed-in runs (`ranked`) are saved
 * to the prize board; anyone's run can unlock the unreleased track. Null when the
 * server can't be reached.
 */
export interface GameRunStart {
  runToken: string;
  ranked: boolean;
  signInExpired: boolean;
}
export async function startGameRun(token: string | null, game: string, mode?: "sprint"): Promise<GameRunStart | null> {
  try {
    const res = await fetch(`${API_URL}/games/${game}/start`, {
      method: "POST",
      headers: token ? authJson(token) : { "Content-Type": "application/json" },
      body: JSON.stringify(mode ? { mode } : {}),
    });
    if (!res.ok) return null;
    const r = (await res.json()) as Partial<GameRunStart> & { runToken: string };
    // (An older server only sent the token: then a signed-in start counts.)
    return { runToken: r.runToken, ranked: r.ranked ?? Boolean(token), signInExpired: Boolean(r.signInExpired) };
  } catch {
    return null;
  }
}

/** Beat Breaker's songs (signed links) and the levels where they — and the unreleased track — kick in. */
export interface GameMusic {
  songsFromLevel: number;
  unreleasedFromLevel: number;
  songs: { id: string; title: string; artist: string; src: string }[];
  hasUnreleased: boolean;
}
export const getGameMusic = (game: string) => safeGet<GameMusic | null>(`/games/${game}/music`, null, 300);

/** Lenko Psycho's songs as short clips (signed links), for DMY Pool's soundtrack. */
export interface SongClips {
  clipSeconds: number;
  songs: { id: string; title: string; artist: string; src: string; href: string | null }[];
}
export const getSongClips = () => safeGet<SongClips | null>("/game-songs", null, 300);

/** A run that reached the unreleased level gets a time-limited link to the track. */
export async function unlockUnreleased(
  token: string | null,
  game: string,
  runToken: string,
  level: number
): Promise<{ title: string; artist: string; src: string }> {
  const res = await fetch(`${API_URL}/games/${game}/unreleased`, {
    method: "POST",
    headers: token ? authJson(token) : { "Content-Type": "application/json" },
    body: JSON.stringify({ runToken, level }),
  });
  const r = await handle<{ title: string; artist: string; src: string }>(res);
  return { ...r, src: `${API_URL}${r.src}` };
}
/**
 * Save a run's progress to the leaderboard (the game calls this as it's played and
 * at game over). Never throws: says whether it saved, or why not —
 * offline (no connection / server down: try again), signin (sign-in expired),
 * busy (too many saves: try again later), early (the run's start reached the server
 * late, so this score can't be checked yet: try again later) or rejected (this run
 * can't be saved).
 */
export type ScoreSave =
  | {
      ok: true;
      saved: number;
      /** "daily": `best`/`newBest` are about the day the game counts for · "best": about the month */
      rules: "daily" | "best";
      newBest: boolean;
      best: number;
      rank: number | null;
      total: number | null;
      month: string;
      /** Daily rules: the day this game counts for (the day it started on) and the month's total. */
      day: { day: string; best: number; points: number; streak: number; bonusPct: number } | null;
      monthPoints: number | null;
      /** A sprint game: the day's sprint board (null for a classic game, or a save after its 15 minutes). */
      sprint: { day: string; best: number; newBest: boolean; rank: number | null; total: number } | null;
    }
  | { ok: false; reason: "offline" | "signin" | "busy" | "early" | "rejected"; message: string };
export async function saveGameScore(
  token: string,
  game: string,
  body: { runToken: string; score: number; level: number },
  opts: { keepalive?: boolean } = {}
): Promise<ScoreSave> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/games/${game}/scores`, {
      method: "POST",
      headers: authJson(token),
      body: JSON.stringify(body),
      keepalive: opts.keepalive, // still sent if the page is closing
    });
  } catch {
    return { ok: false, reason: "offline", message: "Can't reach the leaderboard" };
  }
  if (res.ok) {
    const r = (await res.json().catch(() => null)) as Partial<Extract<ScoreSave, { ok: true }>> | null;
    if (!r) return { ok: false, reason: "offline", message: "Can't reach the leaderboard" };
    return {
      ok: true,
      saved: r.saved ?? body.score,
      rules: r.rules === "daily" ? "daily" : "best",
      newBest: Boolean(r.newBest),
      best: r.best ?? body.score,
      rank: r.rank ?? null,
      total: r.total ?? null,
      month: r.month ?? "",
      day: r.day ?? null,
      monthPoints: r.monthPoints ?? null,
      sprint: r.sprint ?? null,
    };
  }
  const message = ((await res.json().catch(() => ({}))) as { message?: string }).message || `Error ${res.status}`;
  if (res.status === 401) return { ok: false, reason: "signin", message: "Your sign-in has expired" };
  if (res.status === 429) return { ok: false, reason: "busy", message };
  if (res.status === 422) return { ok: false, reason: "early", message };
  if (res.status >= 500) return { ok: false, reason: "offline", message: "The leaderboard isn't responding" };
  return { ok: false, reason: "rejected", message };
}

// ---------- Lenko Trivia ----------
/** The monthly session: none set, coming up, open (members can start their question) or over. */
export interface TriviaSession {
  open: boolean; // false: paused by DMY
  status: "none" | "upcoming" | "open" | "over";
  startsAt: string | null;
  endsAt: string | null; // the last moment to start a question
  seconds: number; // time to answer, from the tap
  prizeGhs: number;
  now: string; // the server's clock
}
export type TriviaResult = "correct" | "wrong" | "unanswered";
export interface TriviaState extends TriviaSession {
  emailConfirmed: boolean;
  noQuestionsYet: boolean; // open, but DMY hasn't switched any questions on
  /** Their question this session: live (with the text and time left), or how it went. */
  mine: {
    attemptId: string;
    roundNumber: number;
    result: TriviaResult | "pending";
    question: { text: string; askSong: boolean; remainingMs: number; seconds: number } | null; // askSong: a lyric question — name the song too
  } | null;
}
/** This month's right answers — they share the prize when the month ends. */
export interface TriviaBoard {
  month: string; // "YYYY-MM"
  endsAt: string;
  prizeGhs: number;
  rounds: number;
  players: number;
  correct: number;
  entries: { name: string; flair?: Flair | null; round: number; at: string; seconds: number | null }[];
}
export async function getTriviaSession(): Promise<TriviaSession> {
  return handle(await fetch(`${API_URL}/trivia/session`, { cache: "no-store" }));
}
/** For server pages: the session, or null if the API can't be reached. */
export const getTriviaSessionSafe = () => safeGet<TriviaSession | null>("/trivia/session", null, 15);
export async function getTriviaState(token: string): Promise<TriviaState> {
  return handle(await fetch(`${API_URL}/trivia/state`, { headers: authJson(token), cache: "no-store" }));
}
/** "Start my question": their one question for the session — the clock starts now. */
export async function startTrivia(token: string): Promise<TriviaState> {
  return handle(await fetch(`${API_URL}/trivia/start`, { method: "POST", headers: authJson(token) }));
}
/** Send the one answer (and, for a lyric question, the song). */
export async function submitTriviaAnswer(token: string, attemptId: string, answer: string, song?: string): Promise<{ result: TriviaResult; locked: boolean }> {
  return handle(
    await fetch(`${API_URL}/trivia/answer`, { method: "POST", headers: authJson(token), body: JSON.stringify({ attemptId, answer, song }) })
  );
}
export const getTriviaBoard = () => {
  const now = new Date();
  return safeGet<TriviaBoard>(
    "/trivia/leaderboard",
    {
      month: now.toISOString().slice(0, 7),
      endsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
      prizeGhs: 1500,
      rounds: 0,
      players: 0,
      correct: 0,
      entries: [],
    },
    15
  );
};

// ---------- Feedback ----------
/** Send a note from the Feedback button (signed-in fans are linked to their account). */
export async function sendFeedback(
  token: string | null,
  body: { message: string; rating: number | null; page: string; name?: string; email?: string; website?: string }
): Promise<void> {
  const res = await fetch(`${API_URL}/feedback`, {
    method: "POST",
    headers: token ? authJson(token) : { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await handle(res);
}

// ---------- Pay-per-view live shows ----------
export interface LiveShow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  poster: string | null;
  startsAt: string;
  durationMins: number;
  priceGhs: number;
  replay: boolean;
  status: "upcoming" | "live" | "ended";
  onSale: boolean;
  hasTicket: boolean;
  canWatch: boolean;
}
/** Server pages get the cached public list; pass a token in the browser for "you have a ticket". */
export async function getLiveShows(token?: string | null): Promise<LiveShow[]> {
  try {
    const res = await fetch(
      `${API_URL}/live`,
      token ? { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" } : publicRead(60)
    );
    return res.ok ? ((await res.json()) as LiveShow[]) : [];
  } catch {
    return [];
  }
}
export async function getLiveShow(slug: string, token?: string | null): Promise<LiveShow | null> {
  try {
    const res = await fetch(
      `${API_URL}/live/${slug}`,
      token ? { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" } : publicRead(60)
    );
    return res.ok ? ((await res.json()) as LiveShow) : null;
  } catch {
    return null;
  }
}
export async function buyLiveTicket(
  token: string,
  slug: string
): Promise<{ authorizationUrl: string; reference: string; amountGhs: number }> {
  const res = await fetch(`${API_URL}/live/${slug}/ticket`, { method: "POST", headers: authJson(token) });
  return handle(res);
}
export async function verifyLiveTicket(token: string, slug: string, reference: string): Promise<LiveShow> {
  const res = await fetch(`${API_URL}/live/${slug}/ticket/verify?reference=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handle(res);
}
export async function watchLiveShow(token: string, slug: string): Promise<{ streamUrl: string; status: string }> {
  const res = await fetch(`${API_URL}/live/${slug}/watch`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handle(res);
}