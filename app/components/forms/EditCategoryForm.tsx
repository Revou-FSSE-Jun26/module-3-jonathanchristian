"use client";

import { useState } from "react";
import type { Category, UpdateCategoryRequest } from "@/lib/types";
import { updateCategory } from "@/lib/api";
import { notifySuccess, notifyFromError } from "@/lib/toast";

export interface EditCategoryFormProps {
  category: Category;
  onUpdated: (category: Category) => void;
  onCancel: () => void;
}

const inputClass =
  "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const errorClass = "mt-1 text-xs text-[var(--color-low-stock)]";

export default function EditCategoryForm({
  category,
  onUpdated,
  onCancel,
}: EditCategoryFormProps) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }
    if (name.trim().length < 2) {
      setNameError("Name must be at least 2 characters.");
      return;
    }
    setNameError(null);

    const payload: UpdateCategoryRequest = {};
    if (name.trim() !== category.name) payload.name = name.trim();
    if (description.trim() !== (category.description ?? "")) {
      payload.description = description.trim();
    }

    if (Object.keys(payload).length === 0) {
      onCancel();
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateCategory(category.id, payload);
      onUpdated(updated);
      notifySuccess(`"${updated.name}" updated.`);
    } catch (err) {
      notifyFromError(err, "Could not update the category.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-3 rounded-2xl border border-[var(--color-brand)]/30 bg-[var(--color-canvas)] p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`edit-cat-name-${category.id}`} className={labelClass}>
            Name <span className="text-[var(--color-low-stock)]">*</span>
          </label>
          <input
            id={`edit-cat-name-${category.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(nameError)}
          />
          {nameError && <p className={errorClass}>{nameError}</p>}
        </div>
        <div>
          <label htmlFor={`edit-cat-desc-${category.id}`} className={labelClass}>
            Description
          </label>
          <input
            id={`edit-cat-desc-${category.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-[var(--color-canvas-alt)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
