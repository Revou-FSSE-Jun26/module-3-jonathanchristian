// Shared HTTP client for the KINETIC Flask backend.
//
// Every resource module (auth, products, categories, orders, payments) goes
// through `apiFetch` / the `request*` helpers here so that base-URL handling,
// cookie-based auth, CSRF, 401 -> refresh retry, and error normalisation live
// in ONE place.
//
// Auth model (see openapi.yaml → Authentication):
//   - The JWT access/refresh tokens are delivered as HttpOnly cookies, so JS
//     can neither read nor attach them. We only have to send requests with
//     `credentials: "include"` and the browser attaches them automatically.
//   - Because cookies are sent automatically, we add double-submit CSRF
//     protection: on every state-changing request (POST/PUT/DELETE) to a
//     protected endpoint we read the readable `csrf_access_token` cookie and
//     echo it back in the `X-CSRF-TOKEN` header. `/auth/refresh` instead needs
//     the `csrf_refresh_token`.
//
// The base URL is read from NEXT_PUBLIC_API_BASE_URL so it is never hardcoded
// in components.

/** Error thrown for any non-OK API response. Carries the HTTP status so the
 *  UI can branch (e.g. 401 -> login, 409 -> deletion guard message). */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. Add it to .env.local (see .env.example)."
    );
  }
  return base.replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// CSRF cookies
//
// The backend sets readable (non-HttpOnly) `csrf_access_token` and
// `csrf_refresh_token` cookies on login/refresh. We read them from
// document.cookie and echo the right one in the X-CSRF-TOKEN header on
// state-changing requests.
// ---------------------------------------------------------------------------

const CSRF_ACCESS_COOKIE = "csrf_access_token";
const CSRF_REFRESH_COOKIE = "csrf_refresh_token";
const CSRF_HEADER = "X-CSRF-TOKEN";

/** Read a cookie value by name (client-side only). Returns null if absent. */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

/** Methods that mutate state and therefore require a CSRF token. */
function isStateChanging(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "DELETE";
}

// ---------------------------------------------------------------------------
// Session invalidation
//
// Auth now lives entirely in cookies the client can't read, so the client no
// longer manages token strings. The only thing the API layer still needs from
// the auth context is a way to tell it "your session is gone" (after a failed
// refresh) so it can clear the cached { name, role } UI snapshot and redirect.
// The auth context registers a provider on the client; when none is registered
// (e.g. SSR of a public page), this is a no-op.
// ---------------------------------------------------------------------------

export interface TokenProvider {
  /** Clear the local session snapshot (called when refresh fails / on 401). */
  onAuthFailure: () => void;
}

let tokenProvider: TokenProvider | null = null;

/** Register the token provider (called once by the auth context on the client). */
export function setTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

interface RequestOptions {
  /** Treat as an authenticated request: enables the 401 -> refresh retry. */
  auth?: boolean;
  /** Query parameters appended to the path. */
  params?: Record<string, string | number | boolean | undefined>;
  /** JSON body; serialised automatically. */
  body?: unknown;
  /** Extra headers. */
  headers?: Record<string, string>;
  /** Use the refresh CSRF token instead of the access one (for /auth/refresh). */
  useRefreshCsrf?: boolean;
}

function buildUrl(
  path: string,
  params?: RequestOptions["params"]
): string {
  const url = `${getBaseUrl()}${path}`;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

/** Attempt to extract a human-readable message from an error response body. */
function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  return fallback;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Perform a single HTTP request (no refresh retry). Throws ApiError on non-OK.
 *
 * Always sends cookies (`credentials: "include"`) so the HttpOnly JWT cookies
 * are attached by the browser. State-changing requests echo the matching CSRF
 * cookie in the X-CSRF-TOKEN header.
 */
async function rawRequest(
  method: string,
  path: string,
  options: RequestOptions
): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (isStateChanging(method)) {
    const csrf = readCookie(
      options.useRefreshCsrf ? CSRF_REFRESH_COOKIE : CSRF_ACCESS_COOKIE
    );
    if (csrf) {
      headers[CSRF_HEADER] = csrf;
    }
  }

  const res = await fetch(buildUrl(path, options.params), {
    method,
    headers,
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const body = await parseBody(res);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      messageFromBody(body, `Request failed (status ${res.status}).`),
      body
    );
  }

  return body;
}

/**
 * Perform an authorised request, transparently refreshing the access token once
 * on a 401 before retrying. The refresh token lives in the HttpOnly
 * `refresh_token_cookie` (sent automatically); we just POST /auth/refresh with
 * the refresh CSRF header. On refresh failure the session is cleared and the
 * original 401 surfaces.
 */
async function requestWithRefresh(
  method: string,
  path: string,
  options: RequestOptions
): Promise<unknown> {
  try {
    return await rawRequest(method, path, options);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401 || !options.auth) {
      throw err;
    }

    // Try to refresh the access token. The refresh cookie is sent
    // automatically; we only need to supply the refresh CSRF header.
    try {
      await rawRequest("POST", "/auth/refresh", { useRefreshCsrf: true });
    } catch (refreshErr) {
      tokenProvider?.onAuthFailure();
      throw refreshErr instanceof ApiError ? refreshErr : err;
    }

    // Retry the original request now that a fresh access cookie is set.
    try {
      return await rawRequest(method, path, options);
    } catch (retryErr) {
      if (retryErr instanceof ApiError && retryErr.status === 401) {
        tokenProvider?.onAuthFailure();
      }
      throw retryErr;
    }
  }
}

// ---------------------------------------------------------------------------
// Public verb helpers (typed wrappers)
// ---------------------------------------------------------------------------

export function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithRefresh("GET", path, options) as Promise<T>;
}

export function apiPost<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithRefresh("POST", path, options) as Promise<T>;
}

export function apiPut<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithRefresh("PUT", path, options) as Promise<T>;
}

export function apiDelete<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithRefresh("DELETE", path, options) as Promise<T>;
}
