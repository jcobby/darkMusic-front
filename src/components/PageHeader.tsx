export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="pointer-events-none absolute inset-x-0 -top-32 h-64 bg-[radial-gradient(50%_100%_at_50%_100%,rgba(45,212,191,0.16),transparent)]" />
      <div className="container-page relative py-20 sm:py-24">
        {eyebrow && (
          <p className="eyebrow mb-4 animate-fade-up">
            <span className="h-px w-6 bg-accent" />
            {eyebrow}
          </p>
        )}
        <h1 className="display-sm max-w-3xl text-white text-balance animate-fade-up">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-neutral-400 animate-fade-up">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
