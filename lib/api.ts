// API client for the RevoShop Flask backend.
//
// The base URL is read from NEXT_PUBLIC_API_BASE_URL so it is never hardcoded
// in components. All functions here run on the server (in Server Components)
// but the NEXT_PUBLIC_ prefix also makes the value available to the client if
// ever needed.

import type {
  Category,
  CategoryWithProducts,
  Product,
} from "./types";

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. Add it to .env.local (see .env.example)."
    );
  }
  return base.replace(/\/$/, "");
}

/**
 * Thin wrapper around fetch that targets the Flask API.
 * `fetch` is not cached by default in this Next.js version, so each request
 * reflects the live API. Callers handle non-OK responses.
 */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${getBaseUrl()}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/** Fetch the full product catalogue. Throws on network / non-OK responses. */
export async function getProducts(): Promise<Product[]> {
  const res = await apiFetch("/products");
  if (!res.ok) {
    throw new Error(`Failed to load products (status ${res.status}).`);
  }
  const data = (await res.json()) as Product[];
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single product by id.
 *
 * The PRD notes that a dedicated detail endpoint may not exist, so we try
 * `GET /products/{id}` first and fall back to locating the product within the
 * full catalogue. Returns null when the product cannot be found.
 */
export async function getProduct(id: number): Promise<Product | null> {
  try {
    const res = await apiFetch(`/products/${id}`);
    if (res.ok) {
      const data = (await res.json()) as Product;
      if (data && typeof data.id === "number") {
        return data;
      }
    } else if (res.status !== 404 && res.status !== 405) {
      // Unexpected server error — fall through to the catalogue fallback.
    }
  } catch {
    // Network error on the detail endpoint — fall back to the catalogue.
  }

  const products = await getProducts();
  return products.find((p) => p.id === id) ?? null;
}

/** Fetch all categories. Throws on network / non-OK responses. */
export async function getCategories(): Promise<Category[]> {
  const res = await apiFetch("/categories");
  if (!res.ok) {
    throw new Error(`Failed to load categories (status ${res.status}).`);
  }
  const data = (await res.json()) as Category[];
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single category together with its products.
 * Returns null when the category does not exist.
 */
export async function getCategory(
  id: number
): Promise<CategoryWithProducts | null> {
  const res = await apiFetch(`/categories/${id}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to load category ${id} (status ${res.status}).`);
  }
  const data = (await res.json()) as CategoryWithProducts;
  return { ...data, products: Array.isArray(data.products) ? data.products : [] };
}
