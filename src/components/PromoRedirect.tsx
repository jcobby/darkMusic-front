"use client";

import { useEffect, useRef } from "react";
import { sendPromoClick } from "@/lib/api";
import { deviceId } from "@/lib/device";
import { getFanToken } from "./FanAuthProvider";

const isYoutube = (v: unknown): v is string => typeof v === "string" && /^https:\/\/((www|m)\.)?(youtube\.com|youtu\.be)\//i.test(v);

/**
 * The page behind a promoter link: tells the server about this visit (it decides whether
 * it counts), then sends the visitor to YouTube — straight away once the server answers,
 * or after 1.5 s at most (the count still goes through in the background).
 */
export function PromoRedirect({ code, target }: { code: string; target: string }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let where = target;
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      window.location.replace(where);
    };
    const timer = setTimeout(go, 1500);
    sendPromoClick(code, deviceId(), getFanToken())
      .then((r) => r.json())
      .then((b: { target?: unknown }) => {
        if (isYoutube(b?.target)) where = b.target;
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        go();
      });
    return () => clearTimeout(timer);
  }, [code, target]);

  return (
    <section className="container-page grid min-h-[55vh] place-items-center py-16 text-center">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent">Lenko Army 🧠🖤</p>
        <p className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">Taking you to YouTube…</p>
        <p className="mt-2 text-sm text-neutral-400">Watch, subscribe and turn on notifications 🔔</p>
        <span aria-hidden className="mx-auto mt-6 block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <a href={target} className="btn-accent mt-6 inline-flex min-h-[48px]">
          Open YouTube →
        </a>
      </div>
    </section>
  );
}
