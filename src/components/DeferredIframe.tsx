"use client";

import { useEffect, useState, type IframeHTMLAttributes } from "react";

/**
 * An embed (Spotify, YouTube) that waits until the page has loaded and gone quiet before it
 * loads. Those players pull in ~1 MB of their own files; on slow mobile data that held up the
 * site's own scripts, so the menu and Play buttons ignored taps for seconds. Until then an empty
 * box of the same size holds the space, so nothing moves.
 */
export function DeferredIframe({ style, className, ...props }: IframeHTMLAttributes<HTMLIFrameElement>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      if (cancelled) return;
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) idle = w.requestIdleCallback(() => !cancelled && setReady(true), { timeout: 3000 });
      else timer = setTimeout(() => !cancelled && setReady(true), 1000);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", go);
      if (idle !== undefined) (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idle);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return (
      <div
        aria-hidden
        className={`${className ?? ""} animate-pulse bg-white/[0.04]`}
        style={{ ...style, width: props.width, height: typeof props.height === "number" ? props.height : undefined }}
      />
    );
  }
  return <iframe className={className} style={style} {...props} />;
}
