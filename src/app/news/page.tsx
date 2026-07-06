import type { Metadata } from "next";
import { getNews, type NewsItem } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { NewsCard } from "@/components/NewsCard";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "News",
  description:
    "Ghana music news, hip-hop headlines and the latest new releases across the scene — updated automatically.",
};

// Fresh on each request; the backend caches the upstream feeds.
export const dynamic = "force-dynamic";

function Section({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: NewsItem[];
}) {
  if (!items.length) return null;
  return (
    <section className="container-page py-12">
      <Reveal>
        <div className="mb-6">
          <h2 className="display-sm text-white">{title}</h2>
          <p className="mt-2 text-sm text-neutral-400">{subtitle}</p>
        </div>
      </Reveal>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <Reveal key={it.link} delay={(i % 3) * 0.08}>
            <NewsCard item={it} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default async function NewsPage() {
  const data = await getNews();
  const empty = !data.news.length && !data.hiphop.length && !data.releases.length;

  return (
    <>
      <PageHeader
        eyebrow="The Scene"
        title="Ghana Music News & Headlines"
        subtitle="Fresh headlines pulled from across the Ghana & African music scene — updated automatically. Tap any story to read it at the source."
      />
      {empty ? (
        <section className="container-page py-16">
          <div className="card p-12 text-center text-neutral-500">
            Headlines are taking a moment to load. Please check back shortly.
          </div>
        </section>
      ) : (
        <>
          <Section
            title="New Releases"
            subtitle="Fresh drops, singles, EPs and albums across the scene."
            items={data.releases}
          />
          <Section
            title="Hip-Hop Headlines"
            subtitle="Rap, drill and bars — the culture right now."
            items={data.hiphop}
          />
          <Section
            title="Ghana Music News"
            subtitle="What's happening across Ghanaian music and entertainment."
            items={data.news}
          />
        </>
      )}
    </>
  );
}
