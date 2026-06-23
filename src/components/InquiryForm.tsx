"use client";

import { useState } from "react";
import { submitInquiry } from "@/lib/api";

type FieldType = "text" | "email" | "tel" | "url" | "textarea" | "select";
interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  full?: boolean;
}

const FORMS: Record<"feature" | "brand" | "contact", Field[]> = {
  feature: [
    { name: "artistName", label: "Artist Name", type: "text", required: true },
    { name: "name", label: "Your Name / Contact", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone / WhatsApp", type: "tel" },
    { name: "songLink", label: "Song Link", type: "url", full: true, placeholder: "https://" },
    { name: "budget", label: "Budget (GH₵)", type: "text" },
    { name: "deadline", label: "Deadline", type: "text", placeholder: "e.g. 2 weeks" },
    { name: "message", label: "Details", type: "textarea", full: true },
  ],
  brand: [
    { name: "businessName", label: "Business / Brand", type: "text", required: true },
    { name: "name", label: "Contact Person", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone / WhatsApp", type: "tel" },
    {
      name: "service",
      label: "Service",
      type: "select",
      options: [
        "Product Placement in Music Videos",
        "Brand Visibility Campaign",
        "Sponsored Content",
        "Event Partnership",
      ],
    },
    { name: "budget", label: "Budget (GH₵)", type: "text" },
    { name: "message", label: "Tell us about your campaign", type: "textarea", full: true },
  ],
  contact: [
    { name: "name", label: "Your Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone / WhatsApp", type: "tel" },
    { name: "message", label: "Message", type: "textarea", required: true, full: true },
  ],
};

export function InquiryForm({ type }: { type: "feature" | "brand" | "contact" }) {
  const fields = FORMS[type];
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (name: string, v: string) => setValues((p) => ({ ...p, [name]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      await submitInquiry({ type, ...values });
      setStatus("done");
      setValues({});
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "done") {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-semibold text-accent">Thank you — your inquiry was sent.</p>
        <p className="mt-2 text-sm text-neutral-400">
          We&apos;ll get back to you at the email you provided.
        </p>
        <button onClick={() => setStatus("idle")} className="btn-outline mt-5">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-6 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
          <label className="label" htmlFor={f.name}>
            {f.label}
            {f.required && <span className="text-accent"> *</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea
              id={f.name}
              className="input min-h-[110px]"
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.name] || ""}
              onChange={(e) => set(f.name, e.target.value)}
            />
          ) : f.type === "select" ? (
            <select
              id={f.name}
              className="input"
              value={values[f.name] || ""}
              onChange={(e) => set(f.name, e.target.value)}
            >
              <option value="">Select…</option>
              {f.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={f.name}
              type={f.type}
              className="input"
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.name] || ""}
              onChange={(e) => set(f.name, e.target.value)}
            />
          )}
        </div>
      ))}

      {error && <p className="sm:col-span-2 text-sm text-red-400">{error}</p>}

      <div className="sm:col-span-2">
        <button type="submit" disabled={status === "sending"} className="btn-accent w-full sm:w-auto">
          {status === "sending" ? "Sending…" : "Submit inquiry"}
        </button>
      </div>
    </form>
  );
}
