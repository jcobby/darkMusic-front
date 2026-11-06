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

/** DMY Pool art: the rack on purple felt, the cue ball lined up. */
/** Pool ball colours by number (9–15 are the same colours, striped). */
const BALL: Record<number, string> = { 1: "#f5c400", 2: "#1f4fd1", 3: "#d42020", 4: "#6a2bbf", 5: "#f07a10", 6: "#1a8a3a", 7: "#7a1f1f", 8: "#111111" };
/** A racked set, apex first, the 8 in the middle of the third row. */
const RACK_ORDER = [1, 11, 5, 2, 8, 10, 9, 7, 14, 4, 6, 15, 13, 3, 12];

/** The DMY Pool tile: a lit table — wood rails with diamonds, the racked balls, the cue ball and a gold cue lined up. */
function Rack() {
  const r = 7;
  const balls = RACK_ORDER.map((id, n) => {
    const row = n < 1 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4;
    const first = [0, 1, 3, 6, 10][row];
    return { id, x: 196 + row * 12.3, y: 90 + (n - first - row / 2) * 14.4 };
  });
  const diamonds = [
    ...[83, 122, 198, 237].flatMap((x) => [{ x, y: 28 }, { x, y: 152 }]),
    ...[{ x: 27, y: 90 }, { x: 293, y: 90 }],
  ];
  return (
    <div className="relative h-full bg-[radial-gradient(70%_70%_at_50%_50%,rgba(191,0,255,0.38),transparent)]">
      <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="rk-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b2a14" />
            <stop offset="0.5" stopColor="#3a1608" />
            <stop offset="1" stopColor="#24090a" />
          </linearGradient>
          <radialGradient id="rk-felt" cx="0.5" cy="0.45" r="0.75">
            <stop offset="0" stopColor="#4a1272" />
            <stop offset="0.7" stopColor="#2c0a44" />
            <stop offset="1" stopColor="#1c062b" />
          </radialGradient>
          <radialGradient id="rk-shine" cx="0.33" cy="0.28" r="0.7">
            <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="0.25" stopColor="#fff" stopOpacity="0.15" />
            <stop offset="1" stopColor="#000" stopOpacity="0.45" />
          </radialGradient>
          <linearGradient id="rk-cue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7a4a12" />
            <stop offset="0.55" stopColor="#d9a441" />
            <stop offset="1" stopColor="#fde68a" />
          </linearGradient>
          <filter id="rk-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          {balls.map((b) => (
            <clipPath key={b.id} id={`rk-c${b.id}`}>
              <circle cx={b.x} cy={b.y} r={r} />
            </clipPath>
          ))}
        </defs>
        {/* Rails, cushion, felt */}
        <rect x="14" y="16" width="292" height="148" rx="16" fill="url(#rk-wood)" stroke="#0d0306" strokeWidth="2" />
        <rect x="27" y="29" width="266" height="122" rx="6" fill="#5c1a86" />
        <rect x="31" y="33" width="258" height="114" rx="4" fill="url(#rk-felt)" />
        <line x1="96" y1="36" x2="96" y2="144" stroke="#fff" strokeOpacity="0.1" strokeDasharray="3 4" />
        <text x="160" y="96" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fillOpacity="0.05" fontFamily="system-ui, sans-serif">
          DMY
        </text>
        {diamonds.map((d, i) => (
          <rect key={i} x={d.x - 2} y={d.y - 2} width="4" height="4" fill="#f3e3c3" opacity="0.85" transform={`rotate(45 ${d.x} ${d.y})`} />
        ))}
        {/* Pockets */}
        {[
          [31, 33],
          [160, 31],
          [289, 33],
          [31, 147],
          [160, 149],
          [289, 147],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="9" fill="#1a1a1a" />
            <circle cx={x} cy={y} r="7" fill="#000" />
          </g>
        ))}
        {/* Aim line, the cue ball and the cue */}
        <line x1="101" y1="99" x2="181" y2="91" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="184" cy="90.7" r={r} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.8" />
        <line x1="78" y1="102" x2="-30" y2="113" stroke="#d9a441" strokeWidth="5" strokeLinecap="round" filter="url(#rk-glow)" opacity="0.6" />
        <line x1="78" y1="102" x2="-30" y2="113" stroke="url(#rk-cue)" strokeWidth="4" strokeLinecap="round" />
        <line x1="78" y1="102" x2="74" y2="102.4" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="93" cy="101" r={r + 3} fill="#fff" opacity="0.35" filter="url(#rk-glow)" />
        <circle cx="93" cy="101" r={r} fill="#f8f8f8" />
        <circle cx="93" cy="101" r={r} fill="url(#rk-shine)" />
        {/* The rack */}
        {balls.map((b) => {
          const color = BALL[b.id > 8 ? b.id - 8 : b.id];
          return (
            <g key={b.id}>
              <circle cx={b.x + 1.3} cy={b.y + 1.6} r={r} fill="#000" opacity="0.35" />
              {b.id > 8 ? (
                <>
                  <circle cx={b.x} cy={b.y} r={r} fill="#f4f4f4" />
                  <rect x={b.x - r} y={b.y - r * 0.55} width={r * 2} height={r * 1.1} fill={color} clipPath={`url(#rk-c${b.id})`} />
                </>
              ) : (
                <circle cx={b.x} cy={b.y} r={r} fill={color} />
              )}
              <circle cx={b.x} cy={b.y} r={r * 0.4} fill="#fff" opacity={b.id === 8 ? 0.9 : 0.75} />
              <circle cx={b.x} cy={b.y} r={r} fill="url(#rk-shine)" />
            </g>
          );
        })}
      </svg>
      <span className="absolute bottom-3 right-4 rounded-full border border-white/15 bg-black/80 px-3 py-1 text-xs font-semibold text-white">1v1 · ranked ladder</span>
    </div>
  );
}

const ART: Record<GameSlug, ReactNode> = {
  "beat-breaker": <Bricks />,
  pool: (
    <div className="relative h-full">
      <Rack />
      <span className="absolute bottom-3 left-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">🎱 Pool Night · Thu 7pm</span>
    </div>
  ),
  "lenko-trivia": (
    <div className="relative grid h-full place-items-center overflow-hidden bg-[radial-gradient(70%_80%_at_50%_40%,rgba(191,0,255,0.45),transparent)]">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-ink/60 font-display text-4xl font-bold text-white shadow-glow">
          ?
        </span>
        <span className="font-display text-4xl font-bold tabular-nums text-white">2:00</span>
      </div>
      <span className="absolute bottom-3 left-4 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-ink">Free · music trivia</span>
      <span className="absolute bottom-3 right-4 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">Last day · 12:00</span>
    </div>
  ),
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
