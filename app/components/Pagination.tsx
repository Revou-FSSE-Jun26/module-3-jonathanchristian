"use client";

/**
 * A small, reusable page navigator (Prev / numbered pages / Next).
 *
 * It's purely presentational: it renders controls for `totalPages` and reports
 * the requested page through `onPageChange`. Callers decide what a page change
 * means — slicing an in-memory array (products) or re-fetching from the API
 * (orders). When there's a single page or fewer, it renders nothing.
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Disable all controls (e.g. while a page is being fetched). */
  disabled?: boolean;
  className?: string;
}

/**
 * Build the list of page buttons to show. For small counts we show them all;
 * for larger counts we collapse the middle with ellipses so the control stays
 * compact: e.g. 1 … 4 5 [6] 7 8 … 20.
 */
function pageItems(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < total - 1) items.push("ellipsis");

  items.push(total);
  return items;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const canPrev = currentPage > 1 && !disabled;
  const canNext = currentPage < totalPages && !disabled;

  const go = (page: number) => {
    const clamped = Math.min(Math.max(page, 1), totalPages);
    if (clamped !== currentPage) onPageChange(clamped);
  };

  const buttonBase =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => go(currentPage - 1)}
        disabled={!canPrev}
        aria-label="Previous page"
        className={`${buttonBase} border border-[var(--color-hairline)] bg-white text-slate-700 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]`}
      >
        <span aria-hidden>←</span>
        <span className="ml-1 hidden sm:inline">Prev</span>
      </button>

      <ul className="flex items-center gap-1.5">
        {pageItems(currentPage, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <li
              key={`ellipsis-${index}`}
              aria-hidden
              className="px-1 text-sm text-slate-400"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => go(item)}
                disabled={disabled}
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? "page" : undefined}
                className={`${buttonBase} ${
                  item === currentPage
                    ? "bg-[var(--color-brand)] text-white"
                    : "border border-[var(--color-hairline)] bg-white text-slate-700 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
                }`}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        onClick={() => go(currentPage + 1)}
        disabled={!canNext}
        aria-label="Next page"
        className={`${buttonBase} border border-[var(--color-hairline)] bg-white text-slate-700 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]`}
      >
        <span className="mr-1 hidden sm:inline">Next</span>
        <span aria-hidden>→</span>
      </button>
    </nav>
  );
}
