import type { CueDesign, MemberTier } from "@/lib/api";

/**
 * Pool cue designs: how each is drawn (butt colour → tip colour) and who can use it —
 * the classic for everyone, the rest for VIPs and Legends (the backend's
 * services/membership checks it too).
 */
export const CUES: Record<CueDesign, { label: string; from: string; to: string; tip: string; glow?: string; tier: MemberTier | null }> = {
  classic: { label: "Classic", from: "#8a6a3f", to: "#d9b37c", tip: "#f5f5f5", tier: null },
  gold: { label: "Gold", from: "#a16207", to: "#fde68a", tip: "#fffbeb", glow: "rgba(250,204,21,0.55)", tier: "vip" },
  neon: { label: "Neon purple", from: "#7e22ce", to: "#f0abfc", tip: "#ffffff", glow: "rgba(191,0,255,0.7)", tier: "vip" },
  lenko: { label: "Lenko black", from: "#0a0a0a", to: "#3f3f46", tip: "#bf00ff", glow: "rgba(191,0,255,0.35)", tier: "vip" },
  diamond: { label: "Diamond", from: "#67e8f9", to: "#f0f9ff", tip: "#ffffff", glow: "rgba(103,232,249,0.6)", tier: "vip" },
};
export const CUE_ORDER: CueDesign[] = ["classic", "gold", "neon", "lenko", "diamond"];

/** A CSS preview of a cue (butt on the left, tip on the right). */
export const cueCss = (c: CueDesign) =>
  `linear-gradient(90deg, ${CUES[c].from} 0%, ${CUES[c].to} 92%, ${CUES[c].tip} 92%, ${CUES[c].tip} 100%)`;
