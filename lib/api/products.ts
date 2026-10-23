// Product catalogue API calls.
// See local/openapi.yaml → Products.

import type {
  CreateProductRequest,
  PaginatedProducts,
  Product,
  UpdateProductRequest,
} from "../types";
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from "./client";

export interface GetProductsParams {
  search?: string;
  page?: number;
}

/**
 * Fetch one page of products. `GET /products` is paginated (6 per page) and
 * returns `{ products, pagination }`.
 */
export async function getProductsPage(
  params: GetProductsParams = {}
): Promise<PaginatedProducts> {
  const data = await apiGet<PaginatedProducts>("/products", {
    params: { search: params.search, page: params.page },
  });
  return {
    products: Array.isArray(data?.products) ? data.products : [],
    pagination: data.pagination,
  };
}

/**
 * Fetch the ENTIRE catalogue by walking every page. Convenience for server
 * components (Home, Products browser) that want the full list up front.
 */
export async function getAllProducts(search?: string): Promise<Product[]> {
  const first = await getProductsPage({ search, page: 1 });
  const all = [...first.products];
  const totalPages = first.pagination?.total_pages ?? 1;

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        getProductsPage({ search, page: i + 2 })
      )
    );
    for (const page of rest) all.push(...page.products);
  }

  return all;
}

/**
 * Backwards-compatible alias returning the full catalogue as a flat array,
 * so existing callers that used `getProducts()` keep working.
 */
export const getProducts = (): Promise<Product[]> => getAllProducts();

/** Fetch a single product by id. Returns null when not found. */
export async function getProduct(id: number): Promise<Product | null> {
  try {
    const data = await apiGet<Product>(`/products/${id}`);
    return data && typeof data.id === "number" ? data : null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    // Fall back to locating the product within the full catalogue.
    const products = await getAllProducts();
    return products.find((p) => p.id === id) ?? null;
  }
}

/** Create a product (admin only). */
export async function createProduct(
  input: CreateProductRequest
): Promise<Product> {
  const data = await apiPost<{ product: Product }>("/products/", {
    auth: true,
    body: input,
  });
  return data.product;
}

/** Update a product (admin only). Only provided fields are changed. */
export async function updateProduct(
  id: number,
  input: UpdateProductRequest
): Promise<Product> {
  const data = await apiPut<{ product: Product }>(`/products/${id}`, {
    auth: true,
    body: input,
  });
  return data.product;
}

/** Soft-delete a product (admin only). Throws ApiError 409 if it has orders. */
export async function deleteProduct(id: number): Promise<void> {
  await apiDelete(`/products/${id}`, { auth: true });
}
