import type { Metadata } from "next";
import { site } from "@/config/site";
import { PageHeader } from "@/components/PageHeader";
import { InquiryForm } from "@/components/InquiryForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Business inquiries, interviews, media requests and partnerships.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title="Contact"
        subtitle="Business inquiries, interviews, media requests and partnerships."
      />
      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <ContactRow label="Email" value={site.contact.email} href={`mailto:${site.contact.email}`} />
          <ContactRow
            label="Management"
            value={site.contact.management}
            href={`mailto:${site.contact.management}`}
          />
          {site.contact.whatsapp ? (
            <ContactRow
              label="WhatsApp"
              value={`+${site.contact.whatsapp}`}
              href={`https://wa.me/${site.contact.whatsapp}`}
            />
          ) : (
            <div className="card p-5">
              <p className="label">WhatsApp</p>
              <p className="text-sm text-neutral-500">Add NEXT_PUBLIC_WHATSAPP_NUMBER to enable.</p>
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-5 text-xl font-bold text-white">Send a message</h2>
          <InquiryForm type="contact" />
        </div>
      </section>
    </>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="card block p-5 transition hover:border-accent"
    >
      <p className="label">{label}</p>
      <p className="text-sm font-medium text-neutral-100">{value}</p>
    </a>
  );
}
