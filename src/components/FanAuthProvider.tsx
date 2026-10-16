"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  addFavorite,
  checkInFan,
  getFanMe,
  getFavorites,
  loginFan,
  registerFan,
  removeFavorite,
  type FanUser,
} from "@/lib/api";

const TOKEN_KEY = "dmy_fan_token";
const favKey = (kind: "release" | "beat", refId: string) => `${kind}:${refId}`;

interface FanAuthValue {
  user: FanUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name?: string,
    phone?: string,
    ref?: string
  ) => Promise<void>;
  logout: () => void;
  checkIn: () => Promise<{ awarded: number; alreadyCheckedIn: boolean }>;
  favorites: Set<string>;
  isFavorite: (kind: "release" | "beat", refId: string) => boolean;
  toggleFavorite: (kind: "release" | "beat", refId: string) => Promise<void>;
  isSubscribed: boolean;
  refreshMe: () => Promise<void>;
}

const Ctx = createContext<FanAuthValue | null>(null);

export function FanAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FanUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(async (token: string) => {
    const favs = await getFavorites(token);
    setFavorites(new Set(favs.map((f) => favKey(f.kind, f.refId))));
  }, []);

  // Restore the session from a stored token on first load. A sign-in that's no
  // longer valid is dropped; a failed connection keeps it and tries again (it used
  // to sign people out, and their game scores then silently didn't count).
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const current = () => !cancelled && localStorage.getItem(TOKEN_KEY) === token; // not signed out/in since
    const attempt = (n: number) => {
      getFanMe(token)
        .then((u) => {
          if (!current()) return;
          if (u) {
            setUser(u);
            void loadFavorites(token);
          } else {
            localStorage.removeItem(TOKEN_KEY); // stale/expired token
          }
          setLoading(false);
        })
        .catch(() => {
          if (!current()) return;
          if (n >= 2) setLoading(false); // stop waiting, but keep the sign-in and keep trying
          timer = setTimeout(() => attempt(n + 1), Math.min(30000, 2000 * 2 ** n));
        });
    };
    attempt(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loadFavorites]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user } = await loginFan({ email, password });
      localStorage.setItem(TOKEN_KEY, token);
      setUser(user);
      void loadFavorites(token);
    },
    [loadFavorites]
  );

  const register = useCallback(
    async (email: string, password: string, name?: string, phone?: string, ref?: string) => {
      const { token, user } = await registerFan({ email, password, name, phone, ref });
      localStorage.setItem(TOKEN_KEY, token);
      setUser(user);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setFavorites(new Set());
  }, []);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const u = await getFanMe(token).catch(() => null);
    if (u) setUser(u);
  }, []);

  const checkIn = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Not signed in");
    const { awarded, alreadyCheckedIn, user } = await checkInFan(token);
    setUser(user);
    return { awarded, alreadyCheckedIn };
  }, []);

  const isFavorite = useCallback(
    (kind: "release" | "beat", refId: string) => favorites.has(favKey(kind, refId)),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (kind: "release" | "beat", refId: string) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      const key = favKey(kind, refId);
      const has = favorites.has(key);
      // Optimistic update.
      setFavorites((prev) => {
        const next = new Set(prev);
        if (has) next.delete(key);
        else next.add(key);
        return next;
      });
      try {
        if (has) await removeFavorite(token, kind, refId);
        else await addFavorite(token, kind, refId);
      } catch {
        // Roll back on failure.
        setFavorites((prev) => {
          const next = new Set(prev);
          if (has) next.add(key);
          else next.delete(key);
          return next;
        });
      }
    },
    [favorites]
  );

  const isSubscribed = Boolean(user?.streamUntil && new Date(user.streamUntil) > new Date());

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        checkIn,
        favorites,
        isFavorite,
        toggleFavorite,
        isSubscribed,
        refreshMe,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useFanAuth(): FanAuthValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFanAuth must be used within FanAuthProvider");
  return ctx;
}

/** Read the stored fan token (for authenticated requests elsewhere). */
export function getFanToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
}
