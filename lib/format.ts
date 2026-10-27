// Formatting helpers shared across server and client components.

/**
 * Format a price (which the API delivers as a decimal string such as
 * "320000.00") into Indonesian Rupiah. Falls back gracefully if the value
 * cannot be parsed.
 */
export function formatPrice(price: string | number): string {
  const value = typeof price === "number" ? price : Number.parseFloat(price);
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Parse the API's string price into a number for cart math. */
export function priceToNumber(price: string | number): number {
  const value = typeof price === "number" ? price : Number.parseFloat(price);
  return Number.isFinite(value) ? value : 0;
}

export type StockLevel = "out" | "low" | "in";

/** Classify stock so UI can colour it (green / orange / grey). */
export function stockLevel(stock: number | undefined): StockLevel {
  if (stock === undefined || stock <= 0) return "out";
  if (stock <= 5) return "low";
  return "in";
}

/** Human-readable stock label. */
export function stockLabel(stock: number | undefined): string {
  const level = stockLevel(stock);
  if (level === "out") return "Out of stock";
  if (level === "low") return `Low stock — only ${stock} left`;
  return "In stock";
}

// ---------------------------------------------------------------------------
// Order status & dates
// ---------------------------------------------------------------------------

import type { OrderStatus } from "./types";

/** Human-readable label for an order status. */
export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Pending payment";
    case "processing":
      return "Processing";
    case "delivering":
      return "Out for delivery";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/**
 * Tailwind utility classes (bg + text) for an order-status pill, aligned with
 * the KINETIC palette: green = done/active, blue = in progress, amber =
 * awaiting, grey = cancelled.
 */
export function orderStatusClasses(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "delivering":
      return "bg-indigo-100 text-indigo-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

/** Format an ISO date-time string into a readable date. Falls back gracefully. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
