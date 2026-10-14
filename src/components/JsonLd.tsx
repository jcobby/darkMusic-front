import { site } from "@/config/site";

/** Structured data for search engines (schema.org JSON-LD). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so the JSON can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export const ORG_ID = `${site.url}/#org`;
export const ARTIST_ID = `${site.url}/#lenko-psycho`;

/** Dark Music Yard (the label) and Lenko Psycho (the artist) — on every page. */
export function siteGraph() {
  const socials = [site.social.tiktok, site.social.instagram, site.social.youtube].filter(Boolean);
  const streaming = [site.streaming.spotify, site.streaming.apple].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: site.name,
        alternateName: "DMY",
        url: site.url,
        logo: `${site.url}/logo.svg`,
        email: site.contact.email,
        sameAs: socials,
      },
      {
        "@type": "MusicGroup",
        "@id": ARTIST_ID,
        name: "Lenko Psycho",
        genre: ["Hip hop", "Ghanaian hip hop", "Rap"],
        foundingLocation: { "@type": "Place", name: "Ghana" },
        url: `${site.url}/about`,
        image: `${site.url}/artist-poster.jpg`,
        sameAs: [...streaming, ...socials],
        recordLabel: { "@id": ORG_ID },
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}
