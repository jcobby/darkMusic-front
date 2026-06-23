import { youtubeId } from "@/lib/youtube";

/** Responsive 16:9 YouTube embed; falls back to a link if the id is unknown. */
export function YouTubeEmbed({
  url,
  title = "Video",
}: {
  url?: string | null;
  title?: string;
}) {
  const id = youtubeId(url);
  if (!id) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-white/[0.06] bg-ink-700/80 p-6 text-center">
        <p className="text-sm text-neutral-500">
          Video coming soon
          {url ? (
            <>
              {" — "}
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent">
                watch on YouTube
              </a>
            </>
          ) : null}
        </p>
      </div>
    );
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 ring-1 ring-white/5">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
