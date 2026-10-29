// Product image API calls (Cloudinary-backed).
// See openapi.yaml → Images.
//
// Each image can be supplied two ways, matching the backend:
//   - a file upload via `multipart/form-data` under the `file` field, or
//   - a JSON `{ url }` (single) or an array of them.
// These helpers accept whichever the caller has and pick the right transport.

import type { ProductImage } from "../types";
import { apiDelete, apiGet, apiPost, apiPut } from "./client";

/** Fetch all (non-deleted) images for a product. Public endpoint. */
export async function getProductImages(
  productId: number
): Promise<ProductImage[]> {
  const data = await apiGet<{ images: ProductImage[] }>(
    `/products/${productId}/images/`
  );
  return Array.isArray(data?.images) ? data.images : [];
}

/**
 * Add one or more images to a product (admin only).
 *
 * Pass `files` for uploaded image files, or `urls` for image URLs. At least one
 * of the two must be non-empty. Files take precedence and are sent as
 * `multipart/form-data`; otherwise URL(s) are sent as JSON.
 */
export async function addProductImages(
  productId: number,
  input: { files?: File[]; urls?: string[] }
): Promise<ProductImage[]> {
  const files = input.files ?? [];
  const urls = (input.urls ?? []).map((u) => u.trim()).filter(Boolean);

  if (files.length === 0 && urls.length === 0) {
    throw new Error("Provide at least one image file or URL.");
  }

  let body: FormData | unknown;
  if (files.length > 0) {
    const form = new FormData();
    for (const file of files) form.append("file", file);
    body = form;
  } else {
    // A single url can be sent as one object; multiple as an array. Sending an
    // array is accepted for both, so normalise to the simplest valid shape.
    body = urls.length === 1 ? { url: urls[0] } : urls.map((url) => ({ url }));
  }

  const data = await apiPost<{ images: ProductImage[] }>(
    `/products/${productId}/images/`,
    { auth: true, body }
  );
  return Array.isArray(data?.images) ? data.images : [];
}

/**
 * Replace an existing image in place (admin only). Provide exactly one
 * replacement: either a `file` or a `url`.
 */
export async function replaceProductImage(
  productId: number,
  imageId: number,
  input: { file?: File; url?: string }
): Promise<ProductImage> {
  let body: FormData | unknown;
  if (input.file) {
    const form = new FormData();
    form.append("file", input.file);
    body = form;
  } else if (input.url && input.url.trim()) {
    body = { url: input.url.trim() };
  } else {
    throw new Error("Provide exactly one replacement image (file or URL).");
  }

  const data = await apiPut<{ image: ProductImage }>(
    `/products/${productId}/images/${imageId}`,
    { auth: true, body }
  );
  return data.image;
}

/** Soft-delete a product image (admin only). */
export async function deleteProductImage(
  productId: number,
  imageId: number
): Promise<void> {
  await apiDelete(`/products/${productId}/images/${imageId}`, { auth: true });
}
