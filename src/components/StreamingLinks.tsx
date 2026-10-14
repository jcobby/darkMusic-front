import { BrandIcon, type Brand } from "./BrandIcon";

type Links = {
  spotify?: string | null;
  apple?: string | null;
  youtube?: string | null;
};

const PLATFORMS: { key: keyof Links & Brand; label: string }[] = [
  { key: "spotify", label: "Spotify" },
  { key: "apple", label: "Apple Music" },
  { key: "youtube", label: "YouTube" },
];

/** Renders buttons (with the platform's icon) only for the platforms that have a URL. */
export function StreamingLinks({
  links,
  size = "sm",
}: {
  links: Links;
  size?: "sm" | "md";
}) {
  const available = PLATFORMS.filter((p) => links[p.key]);
  if (available.length === 0) {
    return <p className="text-xs text-neutral-500">Streaming links coming soon.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2.5">
      {available.map((p) => (
        <a
          key={p.key}
          href={links[p.key] as string}
          target="_blank"
          rel="noopener noreferrer"
          className={`group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] font-medium text-neutral-200 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-white/[0.06] hover:text-white ${
            size === "md" ? "min-h-[44px] px-4 py-2 text-sm" : "min-h-[38px] px-3.5 py-1.5 text-xs"
          }`}
        >
          <BrandIcon brand={p.key} size={size === "md" ? 16 : 14} className="text-accent transition group-hover:text-white" />
          {p.label}
        </a>
      ))}
    </div>
  );
}
