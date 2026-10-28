"use client";

// Authentication context for KINETIC.
//
// Holds a UI-only session snapshot (name + role) and keeps it in sync with the
// real auth state, which lives in HttpOnly JWT cookies set by the backend.
//
// Because the tokens are HttpOnly, JavaScript can neither read nor attach them:
// the browser sends them automatically on credentialed requests, and the client
// can't decode the JWT to learn the user's role. So after login we fetch the
// authoritative role + name from `GET /users/`, and persist just { name, role }
// to localStorage so the signed-in UI survives refresh and stays consistent
// across tabs. Logout calls `POST /auth/logout` so the server clears the
// cookies (the client can't delete HttpOnly cookies itself).
//
// The snapshot is backed by a small external store wrapped with
// useSyncExternalStore: the server snapshot is always "signed out", the client
// reads the real value, and multiple tabs stay in sync via the `storage` event.

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
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  setTokenProvider,
} from "./api";
import type { AuthSession, RegisterRequest, Role } from "./types";

const STORAGE_KEY = "kinetic.auth";

// A readable (non-HttpOnly) marker cookie, scoped to THIS app's origin, that
// mirrors the { role } of the UI snapshot. The real JWT is an HttpOnly cookie
// on the BACKEND's origin, so the Next.js server (proxy.ts) can't see it; this
// marker lets the proxy do a coarse, pre-render redirect for signed-out / wrong
// -role users. It is NOT a security boundary — it's trivially forgeable — so
// ProtectedRoute (client) and the backend remain the real authorities.
const HINT_COOKIE = "kinetic.auth_hint";

/** Write/clear the readable auth-hint cookie used by the server-side proxy. */
function writeHintCookie(role: Role | null): void {
  if (typeof document === "undefined") return;
  if (role) {
    // Session cookie (no Max-Age): lives for the browser session, same as the
    // sign-in UX. SameSite=Lax is fine — it's same-origin to the app.
    document.cookie = `${HINT_COOKIE}=${role}; path=/; SameSite=Lax`;
  } else {
    document.cookie = `${HINT_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
  }
}

// ---------------------------------------------------------------------------
// External session store (localStorage-backed, UI-only snapshot)
// ---------------------------------------------------------------------------

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof parsed.name === "string" &&
      (parsed.role === "admin" || parsed.role === "customer")
    ) {
      return { name: parsed.name, role: parsed.role };
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

/** Write the UI session snapshot to localStorage and notify subscribers. */
function writeSession(next: AuthSession | null): void {
  if (typeof window !== "undefined") {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  // Keep the server-visible hint cookie in sync with the snapshot.
  writeHintCookie(next?.role ?? null);
  // Update the cache synchronously so a read right after login sees the new
  // value immediately.
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

  // Register the token provider once. The API client only needs a way to tell
  // us the session is gone (after a failed refresh / 401), so it can clear the
  // snapshot and let the route guards redirect to /login.
  useEffect(() => {
    setTokenProvider({
      onAuthFailure: () => writeSession(null),
    });
    return () => setTokenProvider(null);
  }, []);

  const logout = useCallback(() => {
    // Clear the local snapshot immediately for a responsive UI, then ask the
    // server to unset the HttpOnly cookies. Ignore network errors — the local
    // session is already gone.
    writeSession(null);
    void apiLogout().catch(() => {
      /* best-effort: cookies may already be expired */
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<Role> => {
      // Sets the auth cookies. Tokens are not in the body.
      const res = await apiLogin({ email, password });
      // The JWT is HttpOnly, so fetch the authoritative role from the backend.
      const user = await getCurrentUser();
      writeSession({ name: res.name || user.name, role: user.role });
      return user.role;
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
