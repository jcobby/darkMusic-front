"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PasswordInput } from "@/components/PasswordInput";
import { SubmitContentCard } from "@/components/SubmitContentCard";
import { useFanAuth, getFanToken } from "@/components/FanAuthProvider";
import {
  getFavorites,
  changePassword,
  forgotPassword,
  initStreamPass,
  verifyStreamPass,
  type FavoriteItem,
} from "@/lib/api";

const todayUTC = () => new Date().toISOString().slice(0, 10);

const WAYS_TO_EARN = [
  { label: "Daily check-in", value: "+5 / day" },
  { label: "Every GH₵1 you spend", value: "+1 pt" },
  { label: "Invite a friend", value: "+50" },
  { label: "Sign up with a code", value: "+25" },
];

export default function AccountPage() {
  const { user, loading, login, register, logout, checkIn, toggleFavorite, isSubscribed, refreshMe } =
    useFanAuth();
  const [favs, setFavs] = useState<FavoriteItem[]>([]);
  const [passBusy, setPassBusy] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passAmount, setPassAmount] = useState("15");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", ref: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [copied, setCopied] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  // Change password (logged-in)
  const [cp, setCp] = useState({ current: "", next: "" });
  const [cpMsg, setCpMsg] = useState<string | null>(null);
  const [cpBusy, setCpBusy] = useState(false);
  // Forgot password (logged-out)
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  // Pick up a referral code from the URL (?ref=) and switch to sign-up.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      setForm((f) => ({ ...f, ref }));
      setMode("register");
    }
  }, []);

  // Load the fan's saved tracks once signed in.
  useEffect(() => {
    if (!user) {
      setFavs([]);
      return;
    }
    const token = getFanToken();
    if (token) getFavorites(token).then(setFavs);
  }, [user]);

  // Keep the account fresh (e.g. email just confirmed in another tab) — re-fetch
  // on mount and whenever the tab regains focus.
  useEffect(() => {
    const refresh = () => {
      if (getFanToken()) void refreshMe();
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refreshMe]);

  async function unfavorite(kind: "release" | "beat", refId: string) {
    await toggleFavorite(kind, refId);
    setFavs((list) => list.filter((f) => !(f.kind === kind && f.refId === refId)));
  }

  async function submitChangePw(e: FormEvent) {
    e.preventDefault();
    const token = getFanToken();
    if (!token) return;
    setCpMsg(null);
    setCpBusy(true);
    try {
      await changePassword(token, cp.current, cp.next);
      setCpMsg("✅ Password changed.");
      setCp({ current: "", next: "" });
    } catch (err) {
      setCpMsg(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setCpBusy(false);
    }
  }

  // Confirm a streaming-pass payment when Paystack returns to /account?pass=1&reference=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");
    if (!ref || !params.get("pass")) return;
    const token = getFanToken();
    if (!token) return;
    verifyStreamPass(token, ref)
      .then(async ({ status }) => {
        if (status === "paid") {
          await refreshMe();
          setPassMsg("✅ Streaming pass active — enjoy!");
        } else {
          setPassMsg("Payment wasn't completed.");
        }
        window.history.replaceState({}, "", "/account");
      })
      .catch(() => {});
  }, [refreshMe]);

  async function buyPass() {
    const token = getFanToken();
    if (!token) return;
    const amount = Math.max(5, Math.round(Number(passAmount)) || 5);
    setPassMsg(null);
    setPassBusy(true);
    try {
      const { authorizationUrl } = await initStreamPass(token, amount);
      window.location.href = authorizationUrl;
    } catch (err) {
      setPassMsg(err instanceof Error ? err.message : "Could not start payment");
      setPassBusy(false);
    }
  }

  async function submitForgot(e: FormEvent) {
    e.preventDefault();
    setForgotMsg(null);
    setBusy(true);
    try {
      const { message } = await forgotPassword(form.email);
      setForgotMsg(message);
    } catch (err) {
      setForgotMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else
        await register(
          form.email,
          form.password,
          form.name || undefined,
          form.phone || undefined,
          form.ref || undefined
        );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function doCheckIn() {
    setCheckMsg(null);
    try {
      const { awarded, alreadyCheckedIn } = await checkIn();
      setCheckMsg(alreadyCheckedIn ? "Already checked in today — come back tomorrow!" : `+${awarded} points! 🎉`);
    } catch (err) {
      setCheckMsg(err instanceof Error ? err.message : "Check-in failed");
    }
  }

  const referralLink =
    user && typeof window !== "undefined"
      ? `${window.location.origin}/account?ref=${user.referralCode}`
      : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked — ignore */
    }
  }

  const checkedInToday = user?.lastCheckIn === todayUTC();

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title={user ? `Welcome, ${user.name || "fan"}` : "Join Dark Music Yard"}
        subtitle={
          user
            ? "Earn points, keep your streak, and bring friends into the yard."
            : "Create a free account to earn rewards, keep a daily streak and invite friends."
        }
      />

      <section className="container-page py-14">
        <div className="mx-auto max-w-md">
          {loading ? (
            <div className="card p-8 text-center text-neutral-500">Loading…</div>
          ) : user ? (
            <div className="space-y-5">
              {!user.emailVerified && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  📧 Please confirm your email — we sent a link to{" "}
                  <span className="font-semibold">{user.email}</span>. You&apos;ll need it to upload
                  content.
                </div>
              )}

              {/* Points + streak */}
              <div className="card p-6">
                <p className="text-xs uppercase tracking-wider text-neutral-500">Signed in as</p>
                <p className="mt-1 font-semibold text-white">{user.email}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-accent/20 bg-accent/[0.06] p-4 text-center">
                    <p className="gradient-text font-display text-3xl font-bold">
                      {user.points.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-neutral-400">
                      Points
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <p className="font-display text-3xl font-bold text-white">
                      {user.streak}🔥
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-neutral-400">
                      Day streak
                    </p>
                  </div>
                </div>

                <button
                  onClick={doCheckIn}
                  disabled={checkedInToday}
                  className="btn-accent mt-4 w-full justify-center disabled:opacity-50"
                >
                  {checkedInToday ? "Checked in today ✓" : "Daily check-in (+5)"}
                </button>
                {checkMsg && <p className="mt-2 text-center text-sm text-accent">{checkMsg}</p>}
              </div>

              {/* Streaming pass */}
              <div className="card p-6">
                <p className="font-semibold text-white">Streaming pass</p>
                {isSubscribed ? (
                  <p className="mt-1 text-sm text-neutral-400">
                    Active until{" "}
                    <span className="font-semibold text-accent">
                      {user.streamUntil ? new Date(user.streamUntil).toLocaleDateString() : ""}
                    </span>
                    . Stream every song in full.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-neutral-400">
                    Donate any amount (min GH₵5) for 30 days of full streaming.
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <span className="relative">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                      GH₵
                    </span>
                    <input
                      type="number"
                      min={5}
                      inputMode="numeric"
                      value={passAmount}
                      onChange={(e) => setPassAmount(e.target.value)}
                      className="input h-10 w-28 py-1 pl-9 text-sm"
                    />
                  </span>
                  <button onClick={buyPass} disabled={passBusy} className="btn-accent">
                    {passBusy ? "Starting…" : isSubscribed ? "Donate & extend 30 days" : "Donate & unlock"}
                  </button>
                </div>
                {passMsg && <p className="mt-2 text-sm text-accent">{passMsg}</p>}
              </div>

              {/* Submit content (creators & models) + submission status */}
              <SubmitContentCard />

              {/* Referral */}
              <div className="card p-6">
                <p className="font-semibold text-white">Invite friends, earn 50 points each</p>
                <p className="mt-1 text-sm text-neutral-400">
                  They get 25 points for joining with your link.
                </p>
                <div className="mt-3 flex gap-2">
                  <input readOnly value={referralLink} className="input flex-1 text-xs" />
                  <button onClick={copyLink} className="btn-outline shrink-0">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Ways to earn */}
              <div className="card p-6">
                <p className="mb-3 font-semibold text-white">Ways to earn</p>
                <ul className="space-y-2">
                  {WAYS_TO_EARN.map((w) => (
                    <li
                      key={w.label}
                      className="flex items-center justify-between border-b border-white/[0.05] pb-2 text-sm text-neutral-300 last:border-0 last:pb-0"
                    >
                      <span>{w.label}</span>
                      <span className="font-semibold text-accent">{w.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Favourites */}
              <div className="card p-6">
                <p className="mb-3 font-semibold text-white">Your favourites</p>
                {favs.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No saved tracks yet — tap the ♥ in the player while a song plays.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {favs.map((f) => (
                      <li key={`${f.kind}:${f.refId}`} className="flex items-center gap-3">
                        <Link
                          href={f.kind === "release" ? `/music/${f.slug}` : "/free-beats"}
                          className="flex min-w-0 flex-1 items-center gap-3 group"
                        >
                          {f.coverImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={f.coverImage}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-white group-hover:text-accent">
                              {f.title}
                            </span>
                            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
                              {f.kind === "release" ? "Song" : "Beat"}
                            </span>
                          </span>
                        </Link>
                        <button
                          onClick={() => void unfavorite(f.kind, f.refId)}
                          className="shrink-0 text-xs text-neutral-500 transition-colors hover:text-red-400"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Change password */}
              <div className="card p-6">
                <p className="mb-3 font-semibold text-white">Change password</p>
                <form onSubmit={submitChangePw} className="space-y-3">
                  <PasswordInput
                    required
                    placeholder="Current password"
                    value={cp.current}
                    onChange={(e) => setCp((s) => ({ ...s, current: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <PasswordInput
                    required
                    minLength={6}
                    placeholder="New password (min 6 characters)"
                    value={cp.next}
                    onChange={(e) => setCp((s) => ({ ...s, next: e.target.value }))}
                    autoComplete="new-password"
                  />
                  {cpMsg && (
                    <p className={`text-sm ${cpMsg.startsWith("✅") ? "text-accent" : "text-red-400"}`}>
                      {cpMsg}
                    </p>
                  )}
                  <button type="submit" disabled={cpBusy} className="btn-outline w-full justify-center">
                    {cpBusy ? "Saving…" : "Update password"}
                  </button>
                </form>
              </div>

              <div className="flex gap-3">
                <Link href="/music" className="btn-accent flex-1 justify-center">
                  Start listening
                </Link>
                <button onClick={logout} className="btn-outline">
                  Log out
                </button>
              </div>
            </div>
          ) : forgotMode ? (
            <div className="card p-8">
              <p className="mb-1 font-semibold text-white">Reset your password</p>
              <p className="mb-5 text-sm text-neutral-400">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={submitForgot} className="space-y-4">
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                  autoComplete="email"
                />
                {forgotMsg && <p className="text-sm text-accent">{forgotMsg}</p>}
                <button type="submit" disabled={busy} className="btn-accent w-full justify-center">
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setForgotMsg(null);
                }}
                className="mt-4 text-sm text-neutral-400 hover:text-accent"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <div className="card p-8">
              {/* Tabs */}
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-ink-800/80 p-1">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={`rounded-full py-2 text-sm font-semibold transition-colors ${
                      mode === m ? "bg-accent text-ink" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {m === "login" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === "register" && (
                  <>
                    <div>
                      <label className="label" htmlFor="name">
                        Name
                      </label>
                      <input
                        id="name"
                        className="input"
                        placeholder="Your name"
                        value={form.name}
                        onChange={set("name")}
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="phone">
                        Phone number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        className="input"
                        placeholder="e.g. 024 123 4567"
                        value={form.phone}
                        onChange={set("phone")}
                        autoComplete="tel"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set("email")}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="password">
                    Password
                  </label>
                  <PasswordInput
                    id="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={set("password")}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>

                {mode === "register" && form.ref && (
                  <p className="text-xs text-accent">Referral code applied — you&apos;ll get 25 bonus points.</p>
                )}
                {error && <p className="text-sm text-red-400">{error}</p>}

                <button type="submit" disabled={busy} className="btn-accent w-full justify-center">
                  {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
                </button>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setError(null);
                    }}
                    className="block w-full text-center text-sm text-neutral-400 hover:text-accent"
                  >
                    Forgot password?
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
