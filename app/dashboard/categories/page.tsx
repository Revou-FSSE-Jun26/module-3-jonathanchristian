"use client";

import { Fragment, useEffect, useState } from "react";
import { getCategories, deleteCategory, ApiError } from "@/lib/api";
import { notifySuccess, notifyFromError, errorMessage } from "@/lib/toast";
import type { Category } from "@/lib/types";
import CreateCategoryForm from "../../components/forms/CreateCategoryForm";
import EditCategoryForm from "../../components/forms/EditCategoryForm";

export default function DashboardCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await getCategories();
        if (cancelled) return;
        setCategories(cats);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err, "Could not load categories."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  const handleCreated = (category: Category) => {
    setCategories((prev) => [...prev, category]);
  };

  const handleUpdated = (category: Category) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, ...category } : c))
    );
    setEditingId(null);
  };

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(
      `Delete "${category.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(category.id);
    try {
      await deleteCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      notifySuccess(`"${category.name}" deleted.`);
    } catch (err) {
      // 409 when products are still attached to this category.
      if (err instanceof ApiError && err.status === 409) {
        notifyFromError(
          err,
          "Can't delete: this category still has products."
        );
      } else {
        notifyFromError(err, "Could not delete the category.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <CreateCategoryForm onCreated={handleCreated} />

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white" />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
          >
            Try again
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-hairline)] bg-white px-6 py-16 text-center text-slate-500">
          No categories yet. Use the form above to add one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {categories.map((category) => (
                <Fragment key={category.id}>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {category.name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {category.description || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingId((id) =>
                              id === category.id ? null : category.id
                            )
                          }
                          className="rounded-full border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-[var(--color-canvas-alt)]"
                        >
                          {editingId === category.id ? "Close" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category.id}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === category.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === category.id && (
                    <tr>
                      <td colSpan={3} className="px-5 pb-5">
                        <EditCategoryForm
                          category={category}
                          onUpdated={handleUpdated}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
