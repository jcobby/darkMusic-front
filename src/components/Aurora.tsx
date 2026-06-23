/**
 * Fixed ambient gradient blobs that drift slowly behind all content — gives the
 * dark theme depth and a cinematic glow without any imagery.
 */
export function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-ink" />
      <div className="absolute -left-40 -top-40 h-[44rem] w-[44rem] animate-aurora rounded-full bg-accent/20 blur-[120px]" />
      <div className="absolute right-[-15rem] top-[10rem] h-[40rem] w-[40rem] animate-aurora-slow rounded-full bg-glow-violet/20 blur-[140px]" />
      <div className="absolute bottom-[-20rem] left-1/3 h-[38rem] w-[38rem] animate-aurora rounded-full bg-glow-cyan/10 blur-[130px]" />
      {/* Vignette to keep edges grounded */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,transparent_40%,rgba(5,5,7,0.85)_100%)]" />
    </div>
  );
}
