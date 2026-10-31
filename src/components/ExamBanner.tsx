"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { EXAM_NAME } from "@/lib/trivia";
import { countdown, examDay, useExam } from "./games/useExam";

const KEY = "dmy_exam_banner_closed"; // the start time of the exam they closed the heads-up for

/**
 * The LA End of Month Exam, announced under the header on every page: a countdown in the
 * days before (closable), then a can't-miss "LIVE NOW" strip for the minutes it's open —
 * shown inside the other games too. While it shows, it takes the place of `children`
 * (the Brick Challenge strip), so there's never two strips.
 */
export function ExamBanner({ children }: { children?: ReactNode }) {
  const pathname = usePathname() || "/";
  const exam = useExam();
  const [closed, setClosed] = useState<number | null>(null);
  useEffect(() => {
    try {
      setClosed(Number(localStorage.getItem(KEY)) || null);
    } catch {
      /* private mode */
    }
  }, []);

  const onExamPage = pathname.startsWith("/games/lenko-trivia") || pathname.startsWith("/admin");
  const inGame = /^\/games\/./.test(pathname);
  const show =
    exam && !onExamPage && (exam.phase === "live" || (!inGame && closed !== exam.startsAt));
  if (!show) return <>{children}</>;

  const prize = `GH₵${exam.prizeGhs.toLocaleString()}`;
  if (exam.phase === "live") {
    return (
      <Link
        href="/games/lenko-trivia"
        className="group block border-b border-red-400/40 bg-gradient-to-r from-red-600 via-accent to-red-600 text-white"
        aria-label={`${EXAM_NAME} is live now — take the exam`}
      >
        <div className="container-page flex items-center gap-2.5 py-2 text-[13px] sm:gap-3 sm:text-sm">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="shrink-0 font-black uppercase tracking-[0.15em]">Live now</span>
          <span className="min-w-0 flex-1 truncate font-semibold">
            <span className="sm:hidden">🧠 LA Exam · {prize}</span>
            <span className="hidden sm:inline">
              🧠 {EXAM_NAME} — {prize} · real ones only
            </span>
            <span className="font-normal text-white/85"> · closes in {countdown(exam.msToEnd)}</span>
          </span>
          <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white transition group-hover:bg-ink/80">Take it →</span>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative border-b border-yellow-400/30 bg-gradient-to-r from-[#1f1405] via-[#14041e] to-[#14041e]">
      <div className="container-page flex items-center gap-2.5 py-1.5 pr-8 text-[13px] sm:gap-3">
        <span aria-hidden className="shrink-0 text-base">
          🧠
        </span>
        <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 sm:inline">{EXAM_NAME}</span>
        <span className="min-w-0 flex-1 truncate text-neutral-200">
          <span className="sm:hidden font-semibold text-yellow-300">LA Exam </span>
          {examDay(exam.startsAt)} · <b className="text-yellow-300">{prize}</b>
          <span className="text-neutral-400"> · starts in </span>
          <b className="font-display tabular-nums text-white">{countdown(exam.msToStart)}</b>
        </span>
        <Link href="/games/lenko-trivia" className="shrink-0 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-ink transition hover:bg-yellow-300">
          Get ready →
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, String(exam.startsAt));
          } catch {
            /* private mode — just hide it for now */
          }
          setClosed(exam.startsAt);
        }}
        aria-label="Close the exam reminder"
        className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
