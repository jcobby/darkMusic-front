import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { latestRelease } from "@/config/site";

// The picture shown when a DMY link is shared (WhatsApp, X, Facebook, iMessage…).
export const alt = `Dark Music Yard — Lenko Psycho. ${latestRelease.title} out now.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const cover = await readFile(join(process.cwd(), "public", latestRelease.coverImage)).catch(() => null);
  const coverSrc = cover ? `data:image/jpeg;base64,${cover.toString("base64")}` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "radial-gradient(circle at 20% 10%, #3a0009 0%, #050507 60%)",
          color: "white",
          padding: 64,
          gap: 56,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 28, letterSpacing: 8, color: "#ff1f3d", fontWeight: 700 }}>DARK MUSIC YARD</div>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1, marginTop: 24 }}>Lenko Psycho</div>
          <div style={{ fontSize: 36, color: "#d4d4d8", marginTop: 24 }}>
            {`“${latestRelease.title}” — out now`}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 40, fontSize: 24, color: "#a1a1aa" }}>
            <span>Music</span>
            <span style={{ color: "#ff1f3d" }}>•</span>
            <span>Free beats</span>
            <span style={{ color: "#ff1f3d" }}>•</span>
            <span>Games</span>
            <span style={{ color: "#ff1f3d" }}>•</span>
            <span>Merch</span>
          </div>
        </div>
        {coverSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            width={420}
            height={420}
            alt=""
            style={{ borderRadius: 28, boxShadow: "0 0 80px rgba(255,31,61,0.55)" }}
          />
        )}
      </div>
    ),
    size
  );
}
