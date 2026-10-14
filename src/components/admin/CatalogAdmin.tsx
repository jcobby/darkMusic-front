"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet, adminSend, adminDelete } from "@/lib/adminApi";

export interface AdminField {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "number" | "checkbox" | "select" | "file" | "datetime";
  hint?: string;
  required?: boolean;
  options?: string[];
  default?: string;
  accept?: string;
  multiple?: boolean;
  placeholder?: string;
}

export interface ResourceConfig {
  key: string;
  label: string;
  endpoint: string;
  primary: string; // field used as the display name
  fields: AdminField[];
}

type Row = Record<string, unknown> & { _id: string };

/** ISO time → the value a datetime-local input shows (in the browser's time zone). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(
  /\/api\/?$/,
  ""
);

export function CatalogAdmin({ config }: { config: ResourceConfig }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [files, setFiles] = useState<Record<string, FileList | null>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminGet<Row[]>(config.endpoint));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [config.endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    const init: Record<string, string | boolean> = {};
    config.fields.forEach((f) => {
      if (f.type === "checkbox") init[f.name] = false;
      else if (f.default !== undefined) init[f.name] = f.default;
    });
    setValues(init);
    setFiles({});
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(row: Row) {
    const init: Record<string, string | boolean> = {};
    config.fields.forEach((f) => {
      if (f.type === "file") return;
      const v = row[f.name];
      if (f.type === "checkbox") init[f.name] = Boolean(v);
      else if (f.type === "datetime") init[f.name] = v ? toLocalInput(String(v)) : "";
      else if (Array.isArray(v)) init[f.name] = v.join(", "); // sizes, categories, languages
      else if (v !== undefined && v !== null) init[f.name] = String(v);
    });
    setValues(init);
    setFiles({});
    setEditingId(row._id);
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      config.fields.forEach((f) => {
        if (f.type === "file") {
          const list = files[f.name];
          if (list) Array.from(list).forEach((file) => form.append(f.name, file));
        } else if (f.type === "checkbox") {
          form.append(f.name, values[f.name] ? "true" : "false");
        } else if (f.type === "datetime") {
          // Send an absolute time; an empty value clears it.
          const v = values[f.name];
          form.append(f.name, v ? new Date(String(v)).toISOString() : "");
        } else {
          const v = values[f.name];
          if (v !== undefined && v !== "") form.append(f.name, String(v));
        }
      });
      if (editingId) {
        await adminSend(`${config.endpoint}/${editingId}`, "PUT", form);
      } else {
        await adminSend(config.endpoint, "POST", form);
      }
      setShowForm(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: Row) {
    if (!confirm(`Delete "${String(row[config.primary])}"? This cannot be undone.`)) return;
    try {
      await adminDelete(`${config.endpoint}/${row._id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{config.label}</h2>
        <button onClick={openCreate} className="btn-accent">
          + Add {config.label.replace(/s$/, "")}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-6 grid gap-4 p-6 sm:grid-cols-2">
          <p className="sm:col-span-2 text-sm font-semibold text-accent">
            {editingId ? `Editing ${config.label.replace(/s$/, "")}` : `New ${config.label.replace(/s$/, "")}`}
          </p>
          {config.fields.map((f) => (
            <Field
              key={f.name}
              field={f}
              value={values[f.name]}
              editing={Boolean(editingId)}
              onText={(v) => setValues((p) => ({ ...p, [f.name]: v }))}
              onCheck={(v) => setValues((p) => ({ ...p, [f.name]: v }))}
              onFile={(list) => setFiles((p) => ({ ...p, [f.name]: list }))}
            />
          ))}
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="btn-accent">
              {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-neutral-500">
          Nothing yet. Click “Add” to create your first {config.label.replace(/s$/, "").toLowerCase()}.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row._id}
              className={`card flex items-center gap-4 p-3 ${row.hidden ? "opacity-55" : ""}`}
            >
              <Thumb row={row} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">
                  {String(row[config.primary] ?? "Untitled")}
                </p>
                <p className="truncate text-xs text-neutral-500">{summarize(row)}</p>
              </div>
              <button onClick={() => openEdit(row)} className="btn-ghost text-xs">
                Edit
              </button>
              <button
                onClick={() => onDelete(row)}
                className="text-xs text-neutral-500 hover:text-red-400"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  field,
  value,
  editing,
  onText,
  onCheck,
  onFile,
}: {
  field: AdminField;
  value: string | boolean | undefined;
  editing: boolean;
  onText: (v: string) => void;
  onCheck: (v: boolean) => void;
  onFile: (list: FileList | null) => void;
}) {
  const wide = field.type === "textarea" || field.type === "file";
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={field.name}>
        {field.label}
        {field.required && <span className="text-accent"> *</span>}
      </label>
      {field.type === "checkbox" ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onCheck(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          {field.placeholder ?? "Enabled"}
        </label>
      ) : field.type === "textarea" ? (
        <textarea
          id={field.name}
          className="input min-h-[90px]"
          value={(value as string) || ""}
          onChange={(e) => onText(e.target.value)}
        />
      ) : field.type === "select" ? (
        <select
          id={field.name}
          className="input"
          value={(value as string) || ""}
          onChange={(e) => onText(e.target.value)}
        >
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === "file" ? (
        <>
          <input
            id={field.name}
            type="file"
            accept={field.accept}
            multiple={field.multiple}
            onChange={(e) => onFile(e.target.files)}
            className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-600 file:px-3 file:py-2 file:text-sm file:text-neutral-100"
          />
          {editing && (
            <p className="mt-1 text-xs text-neutral-500">
              Leave empty to keep the current file.
            </p>
          )}
        </>
      ) : (
        <input
          id={field.name}
          type={
            field.type === "number"
              ? "number"
              : field.type === "url"
              ? "url"
              : field.type === "datetime"
              ? "datetime-local"
              : "text"
          }
          className="input [color-scheme:dark]"
          placeholder={field.placeholder}
          required={field.required}
          value={(value as string) || ""}
          onChange={(e) => onText(e.target.value)}
        />
      )}
      {field.hint && <p className="mt-1 text-xs text-neutral-500">{field.hint}</p>}
    </div>
  );
}

function Thumb({ row }: { row: Row }) {
  const file =
    (row.coverImage as string) ||
    (row.image as string) ||
    ((row.images as string[]) || [])[0] ||
    ((row.photos as string[]) || [])[0] ||
    "";
  if (!file) {
    return <div className="h-12 w-12 shrink-0 rounded-lg bg-ink-600" />;
  }
  const src = /^https?:/.test(file) ? file : `${API_ORIGIN}/uploads/${file}`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />;
}

function summarize(row: Row): string {
  const bits: string[] = [];
  if (row.status === "pending") bits.push("⏳ PENDING REVIEW");
  if (row.status === "rejected") bits.push("✋ REJECTED");
  if (row.hidden) bits.push("🚫 HIDDEN");
  const auction = row.auction as
    | {
        enabled?: boolean;
        endsAt?: string;
        highBidGhs?: number | null;
        bidCount?: number;
        paidAt?: string | null;
        payBy?: string | null;
        unsold?: boolean;
        lapsed?: unknown[];
      }
    | undefined;
  if (auction?.enabled && auction.endsAt) {
    const ended = new Date(auction.endsAt).getTime() <= Date.now();
    const top = auction.highBidGhs != null ? `GH₵${auction.highBidGhs}` : null;
    const when = (iso: string) =>
      new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" });
    const missed = auction.lapsed?.length ? ` · ${auction.lapsed.length} missed payment` : "";
    bits.push(
      auction.paidAt
        ? `🔨 SOLD · paid ${top ?? ""}`
        : auction.unsold
        ? `🔨 UNSOLD — tick Relist${missed}`
        : ended
        ? `🔨 ENDED · ${top ? `won at ${top}${auction.payBy ? `, pay by ${when(auction.payBy)}` : ""}` : "no bids"}${missed}`
        : `🔨 LIVE · ${auction.bidCount ?? 0} bids${top ? ` · top ${top}` : ""} · ends ${when(auction.endsAt)}`
    );
  }
  if (row.priceGhs !== undefined) bits.push(`GH₵${row.priceGhs}`);
  if (row.shoot) bits.push(`📸 ${row.shoot}`);
  // Live shows
  if (row.startsAt) {
    bits.push(
      `📅 ${new Date(String(row.startsAt)).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Accra",
      })}`
    );
    if (row.status === "live") bits.push("● LIVE NOW");
    if (row.status === "ended") bits.push("ended");
    if (!row.streamUrl) bits.push("⚠ no stream link yet");
  }
  if (row.ticketsSold !== undefined) bits.push(`🎟 ${row.ticketsSold} sold · GH₵${row.ticketRevenueGhs}`);
  if (row.rateGhs !== undefined) bits.push(`from GH₵${row.rateGhs}`);
  if (row.location) bits.push(`📍 ${row.location}`);
  if (Number(row.ratingCount) > 0) bits.push(`★ ${Number(row.ratingAvg).toFixed(1)} (${row.ratingCount})`);
  if (row.accountEmail) bits.push("🔗 account linked");
  if (row.wavPriceGhs !== undefined) bits.push(`WAV GH₵${row.wavPriceGhs}`);
  if (row.category) bits.push(String(row.category));
  if (row.stock !== undefined) bits.push(`stock ${row.stock}`);
  if (row.downloadable) bits.push("sells MP3");
  if (row.audioKey) bits.push("audio set");
  if (row.mp3FreeKey) bits.push("free MP3 set");
  if (row.wavKey) bits.push("WAV set");
  if (row.isWelcome) bits.push("🔊 welcome");
  if (row.isFeatured) bits.push("featured");
  // Download / play stats
  if (Number(row.downloads) > 0) bits.push(`⬇ ${row.downloads} sold`);
  if (Number(row.wavDownloads) > 0) bits.push(`⬇ ${row.wavDownloads} WAV`);
  if (Number(row.freeDownloads) > 0) bits.push(`⬇ ${row.freeDownloads} free`);
  if (Number(row.plays) > 0) bits.push(`▶ ${row.plays} plays`);
  return bits.join(" · ") || "—";
}
