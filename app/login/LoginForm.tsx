"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { notifySuccess, notifyFromError, errorMessage } from "@/lib/toast";

/** Only allow same-site relative paths as a post-login redirect target. */
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  // Must be a root-relative path, not a protocol-relative or absolute URL.
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));
  const { login, isAuthenticated, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → send away (back button can't return here).
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(nextPath ?? "/");
    }
  }, [loading, isAuthenticated, router, nextPath]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!password) {
      next.password = "Password is required.";
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const role = await login(email.trim(), password);
      notifySuccess("Welcome back!");
      // Honor an intended destination from the proxy redirect (?next=), but
      // only if the role is allowed there; otherwise fall back to the role's
      // default landing. Admins default to the dashboard, customers to home.
      const fallback = role === "admin" ? "/dashboard" : "/";
      const dest =
        nextPath && !(role !== "admin" && nextPath.startsWith("/dashboard"))
          ? nextPath
          : fallback;
      router.replace(dest);
    } catch (err) {
      const message = errorMessage(err, "Invalid email or password.");
      setFormError(message);
      notifyFromError(err, "Invalid email or password.");
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";
  const errorClass = "mt-1 text-xs text-[var(--color-low-stock)]";
  const required = <span className="text-[var(--color-low-stock)]">*</span>;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {formError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="login-email" className={labelClass}>
          Email {required}
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="login-password" className={labelClass}>
          Password {required}
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password && <p className={errorClass}>{errors.password}</p>}
      </div>

      <p className="text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--color-brand)] hover:underline"
        >
          Register
        </Link>
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Login"}
      </button>
    </form>
  );
}
