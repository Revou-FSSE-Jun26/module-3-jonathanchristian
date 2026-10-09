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
