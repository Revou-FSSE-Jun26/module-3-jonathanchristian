"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { notifySuccess, notifyFromError, errorMessage } from "@/lib/toast";

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
  const router = useRouter();
  const { register, isAuthenticated, loading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → send away.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, router]);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        address: address.trim(),
      });
      notifySuccess("Account created. Welcome to KINETIC!");
      router.replace("/");
    } catch (err) {
      const message = errorMessage(err, "Registration failed. Please try again.");
      setFormError(message);
      notifyFromError(err, "Registration failed. Please try again.");
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
        disabled={submitting}
        className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
