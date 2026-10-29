"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getCurrentUser, updateCurrentUser } from "@/lib/api";
import { notifySuccess, notifyFromError, errorMessage } from "@/lib/toast";
import type { UpdateUserRequest, User } from "@/lib/types";

interface FieldErrors {
  name?: string;
  password?: string;
  phone?: string;
  address?: string;
}

const PHONE_PATTERN = /^[+\d][\d\s()-]{6,}$/;

export default function ProfileForm() {
  const router = useRouter();
  const { refreshSession } = useAuth();

  // The loaded profile, used as the baseline to diff against on submit so we
  // only send fields the user actually changed (the API does partial updates).
  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Editable fields. Email is shown read-only and never submitted.
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load the authenticated user's current data and pre-fill the form.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getCurrentUser();
        if (!active) return;
        setUser(data);
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
      } catch (err) {
        if (!active) return;
        setLoadError(errorMessage(err, "Could not load your profile."));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    // All editable fields are optional on update, but a provided value must be
    // non-empty. Password, when set, must be at least 8 characters.
    if (!name.trim()) {
      next.name = "Name is required.";
    } else if (name.trim().length < 2) {
      next.name = "Name must be at least 2 characters.";
    }

    if (password && password.length < 8) {
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

  /** Build a payload containing only the fields that actually changed. */
  const buildPayload = (): UpdateUserRequest => {
    const payload: UpdateUserRequest = {};
    if (!user) return payload;

    if (name.trim() !== (user.name ?? "")) payload.name = name.trim();
    if (phone.trim() !== (user.phone ?? "")) payload.phone = phone.trim();
    if (address.trim() !== (user.address ?? "")) payload.address = address.trim();
    // Password has no baseline to compare; send it only if the user typed one.
    if (password) payload.password = password;

    return payload;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      setFormError("No changes to save.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateCurrentUser(payload);
      setUser(updated);
      // Reset the editable state from the server's response.
      setName(updated.name ?? "");
      setPhone(updated.phone ?? "");
      setAddress(updated.address ?? "");
      setPassword("");
      // Keep the header greeting / guards in sync if the name changed.
      await refreshSession().catch(() => {
        /* snapshot refresh is best-effort */
      });
      notifySuccess("Profile updated.");
    } catch (err) {
      const message = errorMessage(err, "Could not update your profile.");
      setFormError(message);
      notifyFromError(err, "Could not update your profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20";
  const readOnlyInputClass =
    "w-full cursor-not-allowed rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas-alt)] px-3 py-2 text-sm text-slate-500";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";
  const errorClass = "mt-1 text-xs text-[var(--color-low-stock)]";
  const required = <span className="text-[var(--color-low-stock)]">*</span>;

  // ----- Loading / error states -------------------------------------------
  if (loadError) {
    return (
      <div className="grid gap-4">
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {loadError}
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="justify-self-start rounded-full border border-[var(--color-hairline)] px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--color-canvas-alt)]"
        >
          Back to home
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="flex min-h-[12rem] items-center justify-center text-sm text-slate-500"
        role="status"
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-2">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-hairline)] border-t-[var(--color-brand)]"
            aria-hidden
          />
          Loading your profile…
        </span>
      </div>
    );
  }

  // ----- Form --------------------------------------------------------------
  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <h2 className="text-left text-xl font-bold tracking-tight text-slate-900">
        Hi, {user.name}
      </h2>

      {formError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="profile-email" className={labelClass}>
          Email
        </label>
        <input
          id="profile-email"
          type="email"
          value={user.email}
          readOnly
          disabled
          className={readOnlyInputClass}
          aria-describedby="profile-email-note"
        />
        <p id="profile-email-note" className="mt-1 text-xs text-slate-500">
          Email can&apos;t be changed.
        </p>
      </div>

      <div>
        <label htmlFor="profile-name" className={labelClass}>
          Name {required}
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <p className={errorClass}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="profile-password" className={labelClass}>
          Password
        </label>
        <input
          id="profile-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
          placeholder="Leave blank to keep current password"
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password && <p className={errorClass}>{errors.password}</p>}
      </div>

      <div>
        <label htmlFor="profile-phone" className={labelClass}>
          Phone number {required}
        </label>
        <input
          id="profile-phone"
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
        <label htmlFor="profile-address" className={labelClass}>
          Address {required}
        </label>
        <textarea
          id="profile-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          className={`${inputClass} resize-y`}
          autoComplete="street-address"
          aria-invalid={Boolean(errors.address)}
        />
        {errors.address && <p className={errorClass}>{errors.address}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="rounded-full border border-[var(--color-hairline)] px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--color-canvas-alt)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
