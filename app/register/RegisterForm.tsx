"use client";

import { useState } from "react";
import Link from "next/link";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d][\d\s()-]{6,}$/;

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!name.trim()) {
      next.name = "Name is required.";
    } else if (name.trim().length < 2) {
      next.name = "Name must be at least 2 characters.";
    }

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

    if (!phone.trim()) {
      next.phone = "Phone number is required.";
    } else if (!PHONE_PATTERN.test(phone.trim())) {
      next.phone = "Enter a valid phone number.";
    }

    if (!address.trim()) {
      next.address = "Address is required.";
    } else if (address.trim().length < 5) {
      next.address = "Address must be at least 5 characters.";
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
        <label htmlFor="register-name" className={labelClass}>
          Name {required}
        </label>
        <input
          id="register-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <p className={errorClass}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="register-email" className={labelClass}>
          Email {required}
        </label>
        <input
          id="register-email"
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
        <label htmlFor="register-password" className={labelClass}>
          Password {required}
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password && <p className={errorClass}>{errors.password}</p>}
      </div>

      <div>
        <label htmlFor="register-phone" className={labelClass}>
          Phone number {required}
        </label>
        <input
          id="register-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
        />
        {errors.phone && <p className={errorClass}>{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="register-address" className={labelClass}>
          Address {required}
        </label>
        <textarea
          id="register-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          className={`${inputClass} resize-y`}
          autoComplete="street-address"
          aria-invalid={Boolean(errors.address)}
        />
        {errors.address && <p className={errorClass}>{errors.address}</p>}
      </div>

      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--color-brand)] hover:underline"
        >
          Login
        </Link>
      </p>

      <button
        type="submit"
        className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
      >
        Create account
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
