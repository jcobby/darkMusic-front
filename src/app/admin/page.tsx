"use client";

import { useEffect, useState } from "react";
import { adminLogin, getToken, clearToken } from "@/lib/adminApi";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminLogin(email, password);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearToken();
    setAuthed(false);
  }

  if (authed === null) {
    return <div className="container-page py-20 text-center text-neutral-500">Loading…</div>;
  }

  if (!authed) {
    return (
      <section className="container-page flex min-h-[70vh] items-center justify-center py-12">
        <form onSubmit={onLogin} className="card w-full max-w-sm space-y-4 p-7">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Login</h1>
            <p className="mt-1 text-sm text-neutral-400">Dark Music Yard dashboard</p>
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-accent w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    );
  }

  return <AdminDashboard onLogout={logout} />;
}
