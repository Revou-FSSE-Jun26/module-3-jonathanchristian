"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category, Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import SearchBar from "../components/SearchBar";
import ProductGrid from "../components/ProductGrid";
import Pagination from "../components/Pagination";

/** Products shown per page (client-side; independent of the API's page size). */
const PAGE_SIZE = 8;

export interface ProductsBrowserProps {
  initialProducts: Product[];
  categories: Category[];
}

export default function ProductsBrowser({
  initialProducts,
  categories,
}: ProductsBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const products = initialProducts;
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [categoryId, setCategoryId] = useState<number | "all">(() => {
    const raw = searchParams.get("category");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isInteger(parsed) ? parsed : "all";
  });
  const [page, setPage] = useState(() => {
    const raw = searchParams.get("page");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });

  const { itemCount, total } = useCart();

  // Push the current view (search / category / page) to the URL so it stays
  // shareable and survives a refresh. This runs ONLY from user-action handlers
  // below — never on every render. A render-driven effect here would overwrite
  // an incoming `?category=<id>` during a navigation transition, which is the
  // bug that made the category filter vanish. The initializers above are the
  // single place the URL flows *into* state (once, on mount).
  const syncUrl = useCallback(
    (nextQuery: string, nextCategoryId: number | "all", nextPage: number) => {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (nextCategoryId !== "all") {
        params.set("category", String(nextCategoryId));
      }
      if (nextPage > 1) params.set("page", String(nextPage));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return products.filter((product) => {
      const inCategory =
        categoryId === "all" || product.category_id === categoryId;
      if (!inCategory) return false;

      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q)
      );
    });
  }, [products, query, categoryId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Derive the effective page rather than storing a clamped value. When the
  // filtered set shrinks below the current page (e.g. after a search), we show
  // the last valid page without writing state back inside an effect.
  const safePage = Math.min(Math.max(page, 1), totalPages);

  // The slice of products visible on the current page.
  const visible = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  // Reset to the first page whenever a filter changes so the user isn't left
  // stranded on a now-nonexistent page, and push the new view to the URL.
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
    syncUrl(value, categoryId, 1);
  };
  const handleCategoryChange = (value: number | "all") => {
    setCategoryId(value);
    setPage(1);
    syncUrl(query, value, 1);
  };

  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-hairline)] bg-white p-4 lg:flex-row lg:items-center">
        <SearchBar
          value={query}
          onChange={handleQueryChange}
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
              handleCategoryChange(
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {filtered.length === 0 ? (
            <>No products to show</>
          ) : (
            <>
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of {filtered.length} products
            </>
          )}
        </p>
      </div>

      <ProductGrid
        products={visible}
        emptyMessage={
          query || categoryId !== "all"
            ? "No products match your filters."
            : "No products available."
        }
      />

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={(next) => {
          setPage(next);
          syncUrl(query, categoryId, next);
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />
    </div>
  );
}
