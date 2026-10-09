"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category, Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import SearchBar from "../components/SearchBar";
import ProductGrid from "../components/ProductGrid";
import AddProductForm from "../components/AddProductForm";

export interface ProductsBrowserProps {
  initialProducts: Product[];
  categories: Category[];
  categoryProductIds: Record<number, number[]>;
}

export default function ProductsBrowser({
  initialProducts,
  categories,
  categoryProductIds,
}: ProductsBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [categoryId, setCategoryId] = useState<number | "all">(() => {
    const raw = searchParams.get("category");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isInteger(parsed) ? parsed : "all";
  });

  const { itemCount, total } = useCart();

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryId !== "all") params.set("category", String(categoryId));
    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [query, categoryId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowedIds =
      categoryId === "all" ? null : new Set(categoryProductIds[categoryId] ?? []);

    return products.filter((product) => {
      const inCategory =
        allowedIds === null || product.id < 0 || allowedIds.has(product.id);
      if (!inCategory) return false;

      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q)
      );
    });
  }, [products, query, categoryId, categoryProductIds]);

  const handleAddProduct = (product: Product) => {
    setProducts((prev) => [product, ...prev]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-hairline)] bg-white p-4 lg:flex-row lg:items-center">
        <SearchBar
          value={query}
          onChange={setQuery}
          className="flex-1"
          placeholder="Search by name or description..."
        />

        <div className="flex items-center gap-2">
          <label htmlFor="category-filter" className="sr-only">
            Filter by category
          </label>
          <select
            id="category-filter"
            value={categoryId === "all" ? "all" : String(categoryId)}
            onChange={(e) =>
              setCategoryId(
                e.target.value === "all"
                  ? "all"
                  : Number.parseInt(e.target.value, 10)
              )
            }
            className="rounded-full border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 rounded-full bg-[var(--color-canvas)] px-4 py-2 lg:ml-auto">
          <span aria-hidden>🛒</span>
          <span className="text-sm font-medium text-slate-600">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          <span className="h-4 w-px bg-[var(--color-hairline)]" />
          <span className="text-sm font-bold text-slate-900">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      <AddProductForm onAdd={handleAddProduct} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {filtered.length}
          </span>{" "}
          of {products.length} products
        </p>
      </div>

      <ProductGrid
        products={filtered}
        emptyMessage={
          query || categoryId !== "all"
            ? "No products match your filters."
            : "No products available."
        }
      />
    </div>
  );
}
