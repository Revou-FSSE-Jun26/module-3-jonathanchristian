"use client";

import { useState } from "react";
import Link from "next/link";

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }

    if (!password) {
      next.password = "Password is required.";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }

    return next;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(false);
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    // No API, redirect, or storage yet — placeholder only.
    setSuccess(true);
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";
  const errorClass = "mt-1 text-xs text-[var(--color-low-stock)]";
  const required = <span className="text-[var(--color-low-stock)]">*</span>;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
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
        className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
      >
        Login
      </button>

      {success && (
        <span
          className="text-sm font-medium text-[var(--color-in-stock)]"
          role="status"
        >
          Validation passed — API integration coming soon.
        </span>
      )}
    </form>
  );
}
