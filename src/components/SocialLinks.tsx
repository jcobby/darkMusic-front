import { site } from "@/config/site";
import { BrandIcon } from "./BrandIcon";

const handle = (url: string) => {
  const m = url.match(/(?:tiktok\.com\/|instagram\.com\/|youtube\.com\/)(@?[\w.]+)/i);
  return m ? (m[1].startsWith("@") ? m[1] : `@${m[1]}`) : "";
};

const NETWORKS = [
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
] as const;

/**
 * Lenko Psycho's TikTok, Instagram and YouTube. Round icon buttons by default;
 * `labels` turns them into pills that show the network and handle.
 */
export function SocialLinks({ labels = false, className = "" }: { labels?: boolean; className?: string }) {
  const links = NETWORKS.filter((n) => site.social[n.key]);
  if (!links.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {links.map((n) => {
        const url = site.social[n.key];
        return (
          <a
            key={n.key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Lenko Psycho on ${n.label}`}
            title={`${n.label} ${handle(url)}`}
            className={
              labels
                ? "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-2 pl-3 pr-4 text-sm font-semibold text-white transition hover:border-accent/60 hover:bg-accent/10"
                : "grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-neutral-200 transition hover:border-accent/60 hover:bg-accent hover:text-white"
            }
          >
            <BrandIcon brand={n.key} size={labels ? 16 : 18} />
            {labels && (
              <span>
                {n.label} <span className="font-normal text-neutral-400">{handle(url)}</span>
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
