type Links = {
  spotify?: string | null;
  apple?: string | null;
  youtube?: string | null;
};

const PLATFORMS: { key: keyof Links; label: string; dot: string }[] = [
  { key: "spotify", label: "Spotify", dot: "#1DB954" },
  { key: "apple", label: "Apple Music", dot: "#FA57C1" },
  { key: "youtube", label: "YouTube", dot: "#FF0033" },
];

/** Renders buttons only for the platforms that have a URL. */
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
          className={`group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] font-medium text-neutral-200 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06] hover:text-white ${
            size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"
          }`}
        >
          <span
            className="h-2 w-2 rounded-full transition-transform group-hover:scale-125"
            style={{ backgroundColor: p.dot }}
          />
          {p.label}
        </a>
      ))}
    </div>
  );
}
