"use client";

import { Fragment, useEffect, useState } from "react";
import {
  getAllProducts,
  getCategories,
  deleteProduct,
  ApiError,
} from "@/lib/api";
import { formatPrice, stockLabel, stockLevel } from "@/lib/format";
import { notifySuccess, notifyFromError, errorMessage } from "@/lib/toast";
import type { Category, Product } from "@/lib/types";
import CreateProductForm from "../components/forms/CreateProductForm";
import EditProductForm from "../components/forms/EditProductForm";

const STOCK_STYLES: Record<ReturnType<typeof stockLevel>, string> = {
  in: "text-[var(--color-in-stock)]",
  low: "text-[var(--color-low-stock)]",
  out: "text-slate-400",
};

export default function DashboardProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
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
        const [prods, cats] = await Promise.all([
          getAllProducts(),
          getCategories(),
        ]);
        if (cancelled) return;
        setProducts(prods.toSorted((a, b) => a.id - b.id));
        setCategories(cats);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err, "Could not load the catalogue."));
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

  const handleCreated = (product: Product) => {
    setProducts((prev) => [product, ...prev]);
  };

  const handleUpdated = (product: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, ...product } : p))
    );
    setEditingId(null);
  };

  // Image changes update the row but keep the editor open (unlike a field save).
  const handleImagesChange = (product: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, ...product } : p))
    );
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      notifySuccess(`"${product.name}" deleted.`);
    } catch (err) {
      // The backend returns 409 when the product is referenced by an order.
      if (err instanceof ApiError && err.status === 409) {
        notifyFromError(
          err,
          "Can't delete: this product has active orders."
        );
      } else {
        notifyFromError(err, "Could not delete the product.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <CreateProductForm categories={categories} onCreated={handleCreated} />

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white" />
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
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-hairline)] bg-white px-6 py-16 text-center text-slate-500">
          No products yet. Use the form above to add one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold">Stock</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {products.map((product) => (
                <Fragment key={product.id}>
                  <tr>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="line-clamp-1 text-xs text-slate-500">
                          {product.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-semibold ${
                          STOCK_STYLES[stockLevel(product.stock)]
                        }`}
                      >
                        {product.stock} · {stockLabel(product.stock)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingId((id) =>
                              id === product.id ? null : product.id
                            )
                          }
                          className="rounded-full border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-[var(--color-canvas-alt)]"
                        >
                          {editingId === product.id ? "Close" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product.id}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === product.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === product.id && (
                    <tr>
                      <td colSpan={4} className="px-5 pb-5">
                        <EditProductForm
                          product={product}
                          categories={categories}
                          onUpdated={handleUpdated}
                          onImagesChange={handleImagesChange}
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
