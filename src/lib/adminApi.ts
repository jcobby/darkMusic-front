const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "dmy_admin_token";

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearToken();
    throw new Error("Session expired — please log in again");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function authHeader(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function adminLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  // Handle login errors directly so a 401 shows the real reason instead of the
  // generic "session expired" message used for already-authenticated calls.
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || "Invalid email or password");
  }
  const data = (await res.json()) as { token: string };
  setToken(data.token);
  return data.token;
}

/** GET a protected admin resource. */
export async function adminGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/admin${path}`, {
    headers: authHeader(),
    cache: "no-store",
  });
  return handle<T>(res);
}

/** Send multipart form data (create/update with file uploads). */
export async function adminSend<T>(
  path: string,
  method: "POST" | "PUT",
  form: FormData
): Promise<T> {
  const res = await fetch(`${API_URL}/admin${path}`, {
    method,
    headers: authHeader(), // do NOT set Content-Type; browser sets multipart boundary
    body: form,
  });
  return handle<T>(res);
}

export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/admin${path}`, {
    method: "PATCH",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function adminDelete(path: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin${path}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  await handle<void>(res);
}
