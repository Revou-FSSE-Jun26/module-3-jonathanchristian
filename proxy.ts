// Server-side route guard (Next.js 16 "proxy", formerly "middleware").
//
// IMPORTANT — what this can and cannot do:
//   The real auth lives in HttpOnly JWT cookies set by the Flask backend. Since
//   the frontend and backend are on DIFFERENT origins, those cookies belong to
//   the backend's domain and are NEVER sent to this Next.js server — so the
//   proxy cannot read or verify the JWT. Instead it reads a small, readable
//   `kinetic.auth_hint` marker cookie that the app sets on login (see
//   lib/auth-context.tsx). That marker is trivially forgeable, so this guard is
//   a UX optimization only: it gives signed-out / wrong-role users a fast,
//   pre-render redirect instead of a flash of the protected shell.
//
//   The authoritative checks remain:
//     - <ProtectedRoute> on the client (redirects on hydrated auth state), and
//     - the backend, which rejects every unauthenticated/forbidden API call.
//
// Keep this guard and ProtectedRoute's rules in sync.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const HINT_COOKIE = "kinetic.auth_hint";

/** Routes that require any authenticated user. */
const AUTH_PREFIXES = ["/orders", "/cart", "/checkout"];
/** Routes that require the admin role. */
const ADMIN_PREFIXES = ["/dashboard"];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(HINT_COOKIE)?.value ?? null;
  const isAuthed = role === "admin" || role === "customer";

  const needsAdmin = startsWithAny(pathname, ADMIN_PREFIXES);
  const needsAuth = needsAdmin || startsWithAny(pathname, AUTH_PREFIXES);

  if (!needsAuth) {
    return NextResponse.next();
  }

  // Not signed in → send to login, preserving where they were headed.
  if (!isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in but wrong role for an admin route → send to a safe home.
  if (needsAdmin && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Only run on the guarded trees (plus any nested paths). This avoids touching
  // static assets, the API, and public pages entirely.
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/cart/:path*",
    "/checkout/:path*",
  ],
};
