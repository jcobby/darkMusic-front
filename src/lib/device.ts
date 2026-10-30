/**
 * A random id for this browser (kept in localStorage and a cookie). The server sees it on
 * sign-in, so the Lenko Army promoter program can tell when two accounts are one person —
 * and a promoter's link page sends it, so each visitor's click counts once.
 */
const KEY = "dmy_device";
const VALID = /^[A-Za-z0-9-]{16,64}$/;

function fresh(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function deviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(KEY) || document.cookie.match(/(?:^|; )dmy_device=([A-Za-z0-9-]+)/)?.[1] || "";
    if (!VALID.test(id)) id = fresh();
    localStorage.setItem(KEY, id);
    document.cookie = `dmy_device=${id}; path=/; max-age=${400 * 86400}; samesite=lax`;
    return id;
  } catch {
    return null; // storage blocked — the server treats it as an unknown browser
  }
}

export const deviceHeader = (): Record<string, string> => {
  const id = deviceId();
  return id ? { "X-DMY-Device": id } : {};
};
