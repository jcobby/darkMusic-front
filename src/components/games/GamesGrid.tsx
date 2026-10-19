"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { GAMES, readBest, type GameSlug } from "@/lib/games";
import { PHOTOS } from "@/config/media";
import { Reveal } from "../Reveal";

/** A spinning record drawn in CSS (Vinyl Catch's card art). */
function Record() {
  return (
    <span className="relative grid h-28 w-28 animate-[spin_6s_linear_infinite] place-items-center rounded-full bg-[repeating-radial-gradient(circle,#111114_0px,#111114_3px,#1d1d22_4px)] shadow-glow motion-reduce:animate-none">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-accent">
        <span className="h-2 w-2 rounded-full bg-ink" />
      </span>
      <span className="absolute inset-2 rounded-full border-t-2 border-white/25" />
    </span>
  );
}

/** Beat Tap art: four lanes of falling discs above a hit line. */
function Lanes() {
  const discs = [
    [0, 18], [1, 52], [2, 30], [3, 70], [0, 62], [2, 8], [1, 84], [3, 40],
  ];
  return (
    <div className="relative grid h-full grid-cols-4 bg-[radial-gradient(60%_80%_at_50%_85%,rgba(191,0,255,0.35),transparent)]">
      {[0, 1, 2, 3].map((l) => (
        <div key={l} className={`relative ${l ? "border-l border-white/[0.06]" : ""}`}>
          {discs
            .filter(([lane]) => lane === l)
            .map(([, top], i) => (
              <span
                key={i}
                className={`absolute left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border-2 border-accent ${
                  l < 2 ? "bg-ink" : "bg-neutral-100"
                }`}
                style={{ top: `${top}%` }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
            ))}
          <span className="absolute bottom-[10%] left-1/2 h-9 w-9 -translate-x-1/2 rounded-full border-2 border-accent/70" />
        </div>
      ))}
      <span className="absolute inset-x-0 bottom-[calc(10%+18px)] h-0.5 bg-white/30" />
    </div>
  );
}

/** Beat Breaker art: a wall of red bricks, one row lit, ball and paddle below. */
function Bricks() {
  const rows = ["#bf00ff", "#b000f0", "#9400d1", "#8f00c7", "#7000a3"];
  return (
    <div className="relative flex h-full flex-col bg-[radial-gradient(70%_60%_at_50%_20%,rgba(191,0,255,0.3),transparent)] px-[6%] pt-[6%]">
      <div className="grid grid-cols-10 gap-1">
        {rows.flatMap((color, r) =>
          Array.from({ length: 10 }, (_, c) =>
            (r === 3 && (c === 2 || c === 7)) || (r === 4 && c > 3 && c < 6) ? (
              <span key={`${r}-${c}`} className="h-3 sm:h-4" />
            ) : (
              <span
                key={`${r}-${c}`}
                className={`h-3 rounded-sm sm:h-4 ${r === 1 ? "animate-pulse shadow-glow-sm" : ""}`}
                style={{ background: r === 0 && c === 6 ? "#e8b923" : r === 1 ? "#dc85ff" : color }}
              />
            )
          )
        )}
      </div>
      <span className="absolute bottom-[26%] left-[58%] h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_12px_rgba(215,107,255,0.9)]" />
      <span className="absolute bottom-[12%] left-1/2 h-2.5 w-24 -translate-x-1/2 rounded-full bg-accent-deep shadow-glow" />
    </div>
  );
}

const ART: Record<GameSlug, ReactNode> = {
  "beat-breaker": <Bricks />,
  "beat-tap": <Lanes />,
  "vinyl-catch": (
    <div className="grid h-full place-items-center bg-[radial-gradient(70%_70%_at_50%_60%,rgba(191,0,255,0.35),transparent)]">
      <Record />
    </div>
  ),
  memory: (
    <div className="grid h-full grid-cols-4 grid-rows-2 gap-1.5 p-4">
      {[PHOTOS.carRedSeats, null, PHOTOS.couchCrewColor, null, null, PHOTOS.carRedSeats, null, PHOTOS.setDmyTeeBw].map(
        (p, i) =>
          p ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={p.src}
              alt=""
              className="h-full min-h-0 w-full rounded-md object-cover"
              style={{ objectPosition: p.position }}
            />
          ) : (
            <span
              key={i}
              className="grid min-h-0 place-items-center rounded-md border border-accent/30 bg-gradient-to-br from-accent-deep to-ink text-[10px] font-bold text-white/70"
            >
              DMY
            </span>
          )
      )}
    </div>
  ),
  "name-that-cover": (
    <div className="relative h-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PHOTOS.couchCrewColor.src} alt="" className="h-full w-full scale-[2.2] object-cover blur-md" />
      <span className="absolute inset-0 grid place-items-center font-display text-7xl font-bold text-white/90 drop-shadow-lg">
        ?
      </span>
    </div>
  ),
  trivia: (
    <div className="relative h-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PHOTOS.handsUpBw.src}
        alt=""
        className="h-full w-full object-cover opacity-50"
        style={{ objectPosition: "50% 25%" }}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      <span className="absolute bottom-3 left-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">
        8 questions
      </span>
    </div>
  ),
};

/** Home-page row: the first few games, compact, with a link to all of them. */
export function GamesShowcase({ count = 3 }: { count?: number }) {
  return (
    <div className="rail sm:grid-cols-3 sm:gap-4">
      {GAMES.slice(0, count).map((g, i) => (
        <Reveal key={g.slug} delay={i * 0.08}>
          <Link href={`/games/${g.slug}`} className="card-hover group block h-full overflow-hidden">
            <div className="aspect-[16/9] overflow-hidden border-b border-white/[0.06] bg-ink-800">{ART[g.slug]}</div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-display text-lg font-bold text-white">
                  {g.title}
                  {i === 0 && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      New
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-neutral-400">{g.blurb}</p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white shadow-glow-sm transition group-hover:scale-110">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

/** The game cards on /games, each with this browser's personal best. */
export function GamesGrid() {
  const [bests, setBests] = useState<Partial<Record<GameSlug, number | null>>>({});

  useEffect(() => {
    setBests(Object.fromEntries(GAMES.map((g) => [g.slug, readBest(g.slug)])));
  }, []);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {GAMES.map((g, i) => {
        const best = bests[g.slug];
        // The first game is featured across the full width — and so is the last
        // one when it would otherwise sit alone on its row.
        const wide = i === 0 || (i === GAMES.length - 1 && i % 2 === 1);
        return (
          <Reveal key={g.slug} delay={(i % 2) * 0.08} className={wide ? "sm:col-span-2" : ""}>
            <Link href={`/games/${g.slug}`} className="card-hover group block h-full overflow-hidden">
              <div
                className={`overflow-hidden border-b border-white/[0.06] bg-ink-800 ${
                  wide ? "aspect-[16/9] sm:aspect-[21/7]" : "aspect-[16/9]"
                }`}
              >
                {ART[g.slug]}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold text-white">{g.title}</h2>
                  {best !== undefined && best !== null && (
                    <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-neutral-300">
                      Best: <b className="text-white">{best}</b> {g.scoreLabel}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{g.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                  Play now <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
