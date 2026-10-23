// Category API calls.
// See local/openapi.yaml → Categories.

import type {
  Category,
  CategoryWithProducts,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types";
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from "./client";

/** Fetch all categories. */
export async function getCategories(): Promise<Category[]> {
  const data = await apiGet<Category[]>("/categories/");
  return Array.isArray(data) ? data : [];
}

/** Fetch a single category together with its products. Null when not found. */
export async function getCategory(
  id: number
): Promise<CategoryWithProducts | null> {
  try {
    const data = await apiGet<CategoryWithProducts>(`/categories/${id}`);
    return {
      ...data,
      products: Array.isArray(data.products) ? data.products : [],
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** Create a category (admin only). Throws ApiError 409 on duplicate name. */
export async function createCategory(
  input: CreateCategoryRequest
): Promise<Category> {
  const data = await apiPost<{ category: Category }>("/categories/", {
    auth: true,
    body: input,
  });
  return data.category;
}

/** Update a category (admin only). */
export async function updateCategory(
  id: number,
  input: UpdateCategoryRequest
): Promise<Category> {
  const data = await apiPut<{ category: Category }>(`/categories/${id}`, {
    auth: true,
    body: input,
  });
  return data.category;
}

/**
 * Soft-delete a category (admin only).
 * Throws ApiError 409 if products are still attached (deletion guard).
 */
export async function deleteCategory(id: number): Promise<void> {
  await apiDelete(`/categories/${id}`, { auth: true });
}
