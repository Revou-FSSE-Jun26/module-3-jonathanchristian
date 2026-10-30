"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category, Product } from "@/lib/types";
import { formatPrice, priceToNumber } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import SearchBar from "../components/SearchBar";
import ProductGrid from "../components/ProductGrid";
import Pagination from "../components/Pagination";
import PriceRangeSlider, {
  type PriceRange,
} from "../components/PriceRangeSlider";

/** Products shown per page (client-side; independent of the API's page size). */
const PAGE_SIZE = 8;

/**
 * Pick a "nice" slider step (1, 2 or 5 × 10^n) that gives roughly 100 stops
 * across the catalogue's price span, e.g. Rp1.000 or Rp10.000.
 */
function niceStep(span: number): number {
  if (span <= 0) return 1;
  const raw = span / 100;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return Math.max(1, nice * magnitude);
}

interface PriceBounds {
  min: number;
  max: number;
  step: number;
}

/** The view state persisted to the URL. */
interface ViewState {
  q: string;
  category: number | "all";
  /** `null` (or the full catalogue range) means "no price filter". */
  price: PriceRange | null;
  page: number;
}

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

  // Slider bounds come from the catalogue itself, rounded outward to the step
  // so every product sits inside the track. `null` when there's nothing to
  // filter (empty catalogue).
  const priceBounds = useMemo<PriceBounds | null>(() => {
    if (products.length === 0) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const product of products) {
      const price = priceToNumber(product.price);
      if (price < lo) lo = price;
      if (price > hi) hi = price;
    }
    const step = niceStep(hi - lo);
    const min = Math.floor(lo / step) * step;
    let max = Math.ceil(hi / step) * step;
    // Every product has the same price: still give the handles room to move.
    if (max - min < step) max = min + step;
    return { min, max, step };
  }, [products]);

  // The committed price range, derived from `?min_price` / `?max_price` like
  // the other filters. Values are snapped to the step and clamped to the
  // bounds; a reversed range is swapped. Missing params mean the full range.
  const rawMinPrice = searchParams.get("min_price");
  const rawMaxPrice = searchParams.get("max_price");
  const urlPriceRange = useMemo<PriceRange | null>(() => {
    if (!priceBounds) return null;
    const { min, max, step } = priceBounds;
    const parse = (raw: string | null, fallback: number) => {
      if (raw === null || raw.trim() === "") return fallback;
      const value = Number(raw);
      if (!Number.isFinite(value)) return fallback;
      const snapped = min + Math.round((value - min) / step) * step;
      return Math.min(Math.max(snapped, min), max);
    };
    let lo = parse(rawMinPrice, min);
    let hi = parse(rawMaxPrice, max);
    if (lo > hi) [lo, hi] = [hi, lo];
    return [lo, hi];
  }, [priceBounds, rawMinPrice, rawMaxPrice]);
  const urlPriceKey = urlPriceRange ? urlPriceRange.join("-") : "";

  // While a handle is being dragged, the grid filters live from a local draft;
  // the URL is only written on release. The draft remembers which committed
  // range it started from, so any URL change (a commit, Clear, back/forward,
  // a shared link) automatically retires it — no syncing effect needed.
  const [priceDraft, setPriceDraft] = useState<{
    basis: string;
    range: PriceRange;
  } | null>(null);
  const priceRange =
    priceDraft && priceDraft.basis === urlPriceKey
      ? priceDraft.range
      : urlPriceRange;

  const isPriceFiltered = (range: PriceRange | null) =>
    !!range &&
    !!priceBounds &&
    (range[0] > priceBounds.min || range[1] < priceBounds.max);

  // `page` is genuinely local UI state (the current pagination position), so it
  // stays in `useState`, seeded once from the URL.
  const [page, setPage] = useState(() => {
    const raw = searchParams.get("page");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });

  const { itemCount, total } = useCart();

  // Push the current view (search / category / price / page) to the URL so it
  // stays shareable and survives a refresh. This runs ONLY from user-action
  // handlers below — never on every render. Since the filters are derived from
  // the URL, writing the URL here is what makes them actually change.
  const syncUrl = useCallback(
    (next: ViewState) => {
      const params = new URLSearchParams();
      if (next.q.trim()) params.set("q", next.q.trim());
      if (next.category !== "all") {
        params.set("category", String(next.category));
      }
      // Leave the price params out entirely at the full range so the default
      // URL stays clean.
      if (next.price && priceBounds) {
        if (next.price[0] > priceBounds.min) {
          params.set("min_price", String(next.price[0]));
        }
        if (next.price[1] < priceBounds.max) {
          params.set("max_price", String(next.price[1]));
        }
      }
      if (next.page > 1) params.set("page", String(next.page));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, priceBounds]
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
  const filterSignature = `${query}|${categoryId}|${urlPriceKey}`;
  const prevFilterSignature = useRef(filterSignature);
  useEffect(() => {
    if (prevFilterSignature.current !== filterSignature) {
      prevFilterSignature.current = filterSignature;
      setPage(1);
    }
  }, [filterSignature]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const priceActive =
      !!priceRange &&
      !!priceBounds &&
      (priceRange[0] > priceBounds.min || priceRange[1] < priceBounds.max);

    return products.toSorted((a, b) => a.id - b.id).filter((product) => {
      const inCategory =
        categoryId === "all" || product.category_id === categoryId;
      if (!inCategory) return false;

      if (priceActive && priceRange) {
        const price = priceToNumber(product.price);
        if (price < priceRange[0] || price > priceRange[1]) return false;
      }

      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q)
      );
    });
  }, [products, query, categoryId, priceRange, priceBounds]);

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

  // Filter changes flow out through the URL (the source of truth for the
  // filters); they re-derive on the resulting render. Reset pagination to
  // page 1 so the user isn't left stranded on a now-nonexistent page.
  const handleQueryChange = (value: string) => {
    setPage(1);
    syncUrl({ q: value, category: categoryId, price: urlPriceRange, page: 1 });
  };
  const handleCategoryChange = (value: number | "all") => {
    setPage(1);
    syncUrl({ q: query, category: value, price: urlPriceRange, page: 1 });
  };

  const handlePriceChange = (range: PriceRange) => {
    setPriceDraft({ basis: urlPriceKey, range });
  };
  const handlePriceCommit = useCallback(
    (range: PriceRange) => {
      // Ignore no-op commits (e.g. a key press that didn't move a handle).
      if (
        urlPriceRange &&
        range[0] === urlPriceRange[0] &&
        range[1] === urlPriceRange[1]
      ) {
        return;
      }
      setPage(1);
      syncUrl({ q: query, category: categoryId, price: range, page: 1 });
    },
    [urlPriceRange, syncUrl, query, categoryId]
  );

  const hasActiveFilters =
    query.trim() !== "" || categoryId !== "all" || isPriceFiltered(priceRange);

  const handleClearFilters = () => {
    setPage(1);
    setPriceDraft(null);
    syncUrl({ q: "", category: "all", price: null, page: 1 });
  };

  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-hairline)] bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {priceBounds && priceRange && (
            <PriceRangeSlider
              min={priceBounds.min}
              max={priceBounds.max}
              step={priceBounds.step}
              value={priceRange}
              onChange={handlePriceChange}
              onCommit={handlePriceCommit}
              className="w-full sm:max-w-md"
            />
          )}

          <button
            type="button"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            className="self-start rounded-full border border-[var(--color-hairline)] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--color-hairline)] disabled:hover:text-slate-600 sm:ml-auto sm:self-auto"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500" aria-live="polite">
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
          hasActiveFilters
            ? "No products match your filters."
            : "No products available."
        }
      />

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={(next) => {
          setPage(next);
          syncUrl({
            q: query,
            category: categoryId,
            price: urlPriceRange,
            page: next,
          });
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />
    </div>
  );
}
