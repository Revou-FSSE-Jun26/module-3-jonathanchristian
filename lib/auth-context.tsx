"use client";

// Authentication context for KINETIC.
//
// Holds the signed-in session (tokens + name + role), persists it to
// localStorage so it survives refresh, and registers a TokenProvider with the
// API client so authed requests attach the bearer token and refresh
// transparently on 401. The role is read from the JWT access-token claim.
//
// Session state is backed by a small external store wrapped with
// useSyncExternalStore. This is the idiomatic way to read from an external
// system (localStorage) across SSR + hydration: the server snapshot is always
// "signed out", the client reads the real value, and multiple tabs stay in
// sync via the `storage` event — all without setState-in-effect.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  register as apiRegister,
  setTokenProvider,
} from "./api";
import { getRoleFromToken } from "./jwt";
import type { AuthSession, RegisterRequest, Role } from "./types";

const STORAGE_KEY = "kinetic.auth";

// ---------------------------------------------------------------------------
// External session store (localStorage-backed)
// ---------------------------------------------------------------------------

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      typeof parsed.name === "string" &&
      (parsed.role === "admin" || parsed.role === "customer")
    ) {
      return parsed as AuthSession;
    }
  } catch {
    // Corrupt entry — treat as signed out.
  }
  return null;
}

/** Cached snapshot so getSnapshot returns a stable reference between writes. */
let cachedRaw: string | null = null;
let cachedSession: AuthSession | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function getSnapshot(): AuthSession | null {
  const raw = readRaw();
  if (!hydrated || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = parseSession(raw);
    hydrated = true;
  }
  return cachedSession;
}

/** Server render (and first client render) is always signed out. */
function getServerSnapshot(): AuthSession | null {
  return null;
}

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      // Force a re-read on the next getSnapshot.
      cachedRaw = "\u0000__stale__";
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Write the session to localStorage and notify subscribers. */
function writeSession(next: AuthSession | null): void {
  if (typeof window !== "undefined") {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  // Update the cache synchronously so a request fired right after login sees
  // the new token immediately.
  cachedRaw = next ? JSON.stringify(next) : null;
  cachedSession = next;
  hydrated = true;
  emit();
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  session: AuthSession | null;
  name: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  /** True during the first client render, before hydration settles. */
  loading: boolean;
  login: (email: string, password: string) => Promise<Role>;
  register: (input: RegisterRequest) => Promise<Role>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // `loading` is true only until the component has mounted on the client, so
  // guards don't act on the server's "signed out" snapshot during hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Register the token provider once; it reads live values from the store.
  useEffect(() => {
    setTokenProvider({
      getAccessToken: () => getSnapshot()?.accessToken ?? null,
      getRefreshToken: () => getSnapshot()?.refreshToken ?? null,
      setAccessToken: (token: string) => {
        const current = getSnapshot();
        if (!current) return;
        writeSession({
          ...current,
          accessToken: token,
          role: getRoleFromToken(token),
        });
      },
      onAuthFailure: () => writeSession(null),
    });
    return () => setTokenProvider(null);
  }, []);

  const logout = useCallback(() => writeSession(null), []);

  const login = useCallback(
    async (email: string, password: string): Promise<Role> => {
      const res = await apiLogin({ email, password });
      const role = getRoleFromToken(res.access_token);
      writeSession({
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        name: res.name,
        role,
      });
      return role;
    },
    []
  );

  const register = useCallback(
    async (input: RegisterRequest): Promise<Role> => {
      await apiRegister(input);
      // Backend always creates a customer; auto-login to establish the session.
      return login(input.email, input.password);
    },
    [login]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      name: session?.name ?? null,
      role: session?.role ?? null,
      isAuthenticated: session !== null,
      loading: !mounted,
      login,
      register,
      logout,
    }),
    [session, mounted, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return ctx;
}
