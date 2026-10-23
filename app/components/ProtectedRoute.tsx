"use client";

// Client-side route guard.
//
// Wrap a page's content in <ProtectedRoute> to require authentication and,
// optionally, a specific role. Redirects use router.replace() so the back
// button can't return the user to a page they aren't allowed on. Nothing is
// rendered until auth hydration completes, avoiding a flash of protected
// content for signed-out users.

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Require this exact role. Omit to allow any authenticated user. */
  requireRole?: Role;
  /** Where to send unauthenticated users. */
  redirectTo?: string;
}

/** Full-page loading placeholder shown during auth hydration / redirects. */
function GuardFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-hairline)] border-t-[var(--color-brand)]"
          aria-hidden
        />
        Checking your session…
      </span>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  requireRole,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, role, loading } = useAuth();

  const roleMismatch = requireRole !== undefined && role !== requireRole;

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (roleMismatch) {
      // Signed in but wrong role: send admins to their dashboard, others home.
      router.replace(role === "admin" ? "/dashboard" : "/");
    }
  }, [loading, isAuthenticated, roleMismatch, role, router, redirectTo]);

  if (loading || !isAuthenticated || roleMismatch) {
    return <GuardFallback />;
  }

  return <>{children}</>;
}
