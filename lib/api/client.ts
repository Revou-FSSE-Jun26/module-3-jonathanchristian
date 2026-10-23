// Shared HTTP client for the RevoShop Flask backend.
//
// Every resource module (auth, products, categories, orders, payments) goes
// through `apiFetch` / the `request*` helpers here so that base-URL handling,
// bearer-auth, 401 -> refresh retry, and error normalisation live in ONE place.
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
// Token access
//
// The client needs the current access token to authorise requests, the refresh
// token to renew it, and a way to persist a newly-minted access token. To avoid
// a hard dependency on the auth context (and to keep this usable from both
// client and server code), the token provider is injected. The auth context
// registers a provider on the client; when none is registered (e.g. SSR of a
// public page), requests are simply sent unauthenticated.
// ---------------------------------------------------------------------------

export interface TokenProvider {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  /** Persist a refreshed access token. */
  setAccessToken: (token: string) => void;
  /** Clear the session (called when refresh fails). */
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
  /** Attach the bearer access token (default false — public by default). */
  auth?: boolean;
  /** Query parameters appended to the path. */
  params?: Record<string, string | number | boolean | undefined>;
  /** JSON body; serialised automatically. */
  body?: unknown;
  /** Extra headers. */
  headers?: Record<string, string>;
  /** Override the bearer token (used by the refresh call itself). */
  bearerOverride?: string;
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

  const bearer =
    options.bearerOverride ??
    (options.auth ? tokenProvider?.getAccessToken() ?? null : null);
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  const res = await fetch(buildUrl(path, options.params), {
    method,
    headers,
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
 * on a 401 before retrying. On refresh failure the session is cleared and the
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

    const refreshToken = tokenProvider?.getRefreshToken() ?? null;
    if (!refreshToken) {
      tokenProvider?.onAuthFailure();
      throw err;
    }

    // Try to refresh the access token using the refresh token as bearer.
    try {
      const refreshed = (await rawRequest("POST", "/auth/refresh", {
        bearerOverride: refreshToken,
      })) as { access_token?: string } | null;

      const newAccess = refreshed?.access_token;
      if (!newAccess) {
        tokenProvider?.onAuthFailure();
        throw err;
      }
      tokenProvider?.setAccessToken(newAccess);

      // Retry the original request with the new token.
      return await rawRequest(method, path, options);
    } catch (refreshErr) {
      tokenProvider?.onAuthFailure();
      throw refreshErr instanceof ApiError ? refreshErr : err;
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
