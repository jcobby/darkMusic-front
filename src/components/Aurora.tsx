/**
 * Ambient red glows behind all content — gives the dark theme depth and a
 * cinematic feel without any imagery.
 *
 * Drawn as plain radial gradients on one fixed layer: it looks like the old
 * blurred, drifting blobs, but costs the phone nothing after the first paint.
 * (Those 120–140px blurs, re-composited every frame under the page, were the
 * main cause of lag in the games on mid-range and budget phones.)
 */
const GLOWS = [
  "radial-gradient(42rem 42rem at 8% 4%, rgba(255,31,61,0.13), rgba(255,31,61,0) 70%)",
  "radial-gradient(38rem 38rem at 100% 32%, rgba(122,0,17,0.34), rgba(122,0,17,0) 70%)",
  "radial-gradient(36rem 36rem at 55% 108%, rgba(200,0,30,0.09), rgba(200,0,30,0) 70%)",
].join(",");

export function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-ink" />
      <div className="absolute inset-0" style={{ backgroundImage: GLOWS }} />
      {/* Vignette to keep edges grounded */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,transparent_40%,rgba(5,5,7,0.85)_100%)]" />
    </div>
  );
}
