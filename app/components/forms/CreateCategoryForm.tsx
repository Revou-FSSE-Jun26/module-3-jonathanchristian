"use client";

import { useState } from "react";
import type { Category, CreateCategoryRequest } from "@/lib/types";
import { createCategory } from "@/lib/api";
import { notifySuccess, notifyFromError } from "@/lib/toast";

export interface CreateCategoryFormProps {
  onCreated: (category: Category) => void;
}

const inputClass =
  "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const errorClass = "mt-1 text-xs text-[var(--color-low-stock)]";

export default function CreateCategoryForm({
  onCreated,
}: CreateCategoryFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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

    const payload: CreateCategoryRequest = { name: name.trim() };
    if (description.trim()) payload.description = description.trim();

    setSubmitting(true);
    try {
      const category = await createCategory(payload);
      onCreated(category);
      notifySuccess(`"${category.name}" created.`);
      setName("");
      setDescription("");
      setOpen(false);
    } catch (err) {
      notifyFromError(err, "Could not create the category.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Add a category</h2>
          <p className="text-sm text-slate-500">
            Create a new product category.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="rounded-full border border-[var(--color-hairline)] px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--color-canvas-alt)]"
        >
          {open ? "Close" : "New category"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} noValidate className="mt-4 grid gap-4">
          <div>
            <label htmlFor="create-category-name" className={labelClass}>
              Name <span className="text-[var(--color-low-stock)]">*</span>
            </label>
            <input
              id="create-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              aria-invalid={Boolean(nameError)}
            />
            {nameError && <p className={errorClass}>{nameError}</p>}
          </div>

          <div>
            <label htmlFor="create-category-description" className={labelClass}>
              Description
            </label>
            <input
              id="create-category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Add category"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
