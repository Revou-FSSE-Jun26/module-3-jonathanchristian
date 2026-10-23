// Minimal client-side JWT helpers.
//
// The backend embeds the user's `role` claim inside the access token. We only
// need to READ it on the client to drive role-based UI and redirects — we do
// NOT verify the signature (the server remains the source of truth for every
// protected request). Never trust these values for security decisions.

import type { Role } from "./types";

interface JwtPayload {
  role?: string;
  /** Expiry as a Unix timestamp in seconds. */
  exp?: number;
  [key: string]: unknown;
}

/** Decode a base64url string in a way that works in browser and Node. */
function base64UrlDecode(segment: string): string {
  // Convert base64url -> base64, then pad.
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  if (typeof atob === "function") {
    // Browser: atob gives a binary string; decode UTF-8 safely.
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  // Node / SSR fallback.
  return Buffer.from(padded, "base64").toString("utf-8");
}

/** Parse the payload of a JWT. Returns null if the token is malformed. */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

/** Read the `role` claim, normalising to our Role union. Defaults to customer. */
export function getRoleFromToken(token: string): Role {
  const payload = decodeJwt(token);
  return payload?.role === "admin" ? "admin" : "customer";
}

/** True when the token carries an `exp` that is in the past. */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return false;
  // exp is in seconds; Date.now() is in milliseconds.
  return payload.exp * 1000 <= Date.now();
}
