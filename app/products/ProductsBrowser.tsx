"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // `query` and `categoryId` are DERIVED from the URL on every render — the URL
  // is the single source of truth for the active filters. Deriving (rather than
  // mirroring into `useState`) is what keeps repeat navigations working: when a
  // soft navigation changes `?category=<id>`, `useSearchParams()` returns the
  // fresh value and these recompute immediately. A `useState` mirror would only
  // seed once on mount and go stale on the second visit — the original bug.
  const query = searchParams.get("q") ?? "";
  const categoryId = useMemo<number | "all">(() => {
    const raw = searchParams.get("category");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isInteger(parsed) ? parsed : "all";
  }, [searchParams]);

  // `page` is genuinely local UI state (the current pagination position), so it
  // stays in `useState`, seeded once from the URL.
  const [page, setPage] = useState(() => {
    const raw = searchParams.get("page");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });

  const { itemCount, total } = useCart();

  // Push the current view (search / category / page) to the URL so it stays
  // shareable and survives a refresh. This runs ONLY from user-action handlers
  // below — never on every render. Since `query`/`categoryId` are derived from
  // the URL, writing the URL here is what makes the filters actually change.
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

  // When the active filters change via an *external* URL change — e.g. landing
  // on /products?category=1 after already visiting /products?category=3 on a
  // soft navigation — reset pagination to page 1 so the user isn't stranded on
  // a page that may not exist for the new filter. In-app filter edits already
  // reset the page in their handlers; this effect covers the navigation path
  // where no handler runs.
  //
  // We compare against the previous filter signature held in a ref so the only
  // state write is the `page` reset, and only when the filters genuinely
  // changed — not on every `searchParams` identity change (e.g. a `?page=`
  // update, which must NOT reset the page).
  const filterSignature = `${query}|${categoryId}`;
  const prevFilterSignature = useRef(filterSignature);
  useEffect(() => {
    if (prevFilterSignature.current !== filterSignature) {
      prevFilterSignature.current = filterSignature;
      setPage(1);
    }
  }, [filterSignature]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return products.toSorted((a, b) => a.id - b.id).filter((product) => {
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

  // Filter changes flow out through the URL (the source of truth for
  // query/category); `query`/`categoryId` re-derive on the resulting render.
  // Reset pagination to page 1 so the user isn't left stranded on a
  // now-nonexistent page.
  const handleQueryChange = (value: string) => {
    setPage(1);
    syncUrl(value, categoryId, 1);
  };
  const handleCategoryChange = (value: number | "all") => {
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
