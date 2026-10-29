"use client";

import { useState } from "react";
import type { Category, CreateProductRequest, Product } from "@/lib/types";
import { createProduct, addProductImages, getProduct } from "@/lib/api";
import { notifySuccess, notifyFromError } from "@/lib/toast";
import ProductImagesManager, {
  type PendingImage,
} from "./ProductImagesManager";

export interface CreateProductFormProps {
  categories: Category[];
  /** Called with the created product so the parent can update its table. */
  onCreated: (product: Product) => void;
}

interface FieldErrors {
  category_id?: string;
  name?: string;
  description?: string;
  price?: string;
  stock?: string;
}

const inputClass =
  "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const errorClass = "mt-1 text-xs text-[var(--color-low-stock)]";

export default function CreateProductForm({
  categories,
  onCreated,
}: CreateProductFormProps) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  // Images chosen before the product exists; uploaded after it's created.
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategoryId("");
    setName("");
    setDescription("");
    setPrice("");
    setStock("");
    // Discard any locally-collected images — they were never uploaded.
    setPendingImages([]);
    setErrors({});
  };

  // Closing the form cancels product creation, so drop pending images too.
  const handleClose = () => {
    reset();
    setOpen(false);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!categoryId) {
      next.category_id = "Select a category.";
    }
    if (!name.trim()) {
      next.name = "Name is required.";
    } else if (name.trim().length < 2) {
      next.name = "Name must be at least 2 characters.";
    }
    if (!description.trim()) {
      next.description = "Description is required.";
    }

    const priceValue = Number.parseFloat(price);
    if (price.trim() === "") {
      next.price = "Price is required.";
    } else if (!Number.isFinite(priceValue) || priceValue <= 0) {
      next.price = "Price must be a positive number.";
    }

    const stockValue = Number.parseInt(stock, 10);
    if (stock.trim() === "") {
      next.stock = "Stock is required.";
    } else if (!Number.isInteger(stockValue) || stockValue < 0) {
      next.stock = "Stock must be zero or a positive whole number.";
    }

    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const payload: CreateProductRequest = {
      category_id: Number.parseInt(categoryId, 10),
      name: name.trim(),
      description: description.trim(),
      price: Number.parseFloat(price),
      stock: Number.parseInt(stock, 10),
    };

    setSubmitting(true);
    try {
      const product = await createProduct(payload);

      // Upload any images the admin queued, now that the product exists.
      let finalProduct = product;
      if (pendingImages.length > 0) {
        const files = pendingImages
          .filter((p): p is Extract<PendingImage, { kind: "file" }> => p.kind === "file")
          .map((p) => p.file);
        const urls = pendingImages
          .filter((p): p is Extract<PendingImage, { kind: "url" }> => p.kind === "url")
          .map((p) => p.url);

        try {
          // Files and URLs are separate transports (multipart vs JSON), so
          // send each group in its own call.
          if (files.length > 0) {
            await addProductImages(product.id, { files });
          }
          if (urls.length > 0) {
            await addProductImages(product.id, { urls });
          }
          // Re-fetch so the created product carries its new images.
          finalProduct = (await getProduct(product.id)) ?? product;
        } catch (imgErr) {
          // The product itself was created; surface the image failure but don't
          // lose the product from the table.
          notifyFromError(
            imgErr,
            "Product created, but some images failed to upload."
          );
        }
      }

      onCreated(finalProduct);
      notifySuccess(`"${product.name}" created.`);
      reset();
      setOpen(false);
    } catch (err) {
      notifyFromError(err, "Could not create the product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Add a product</h2>
          <p className="text-sm text-slate-500">
            Create a new product in the catalogue.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (open ? handleClose() : setOpen(true))}
          aria-expanded={open}
          className="rounded-full border border-[var(--color-hairline)] px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--color-canvas-alt)]"
        >
          {open ? "Close" : "New product"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} noValidate className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="create-product-category" className={labelClass}>
                Category <span className="text-[var(--color-low-stock)]">*</span>
              </label>
              <select
                id="create-product-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.category_id)}
              >
                <option value="">Select a category…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className={errorClass}>{errors.category_id}</p>
              )}
            </div>

            <div>
              <label htmlFor="create-product-name" className={labelClass}>
                Name <span className="text-[var(--color-low-stock)]">*</span>
              </label>
              <input
                id="create-product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="create-product-price" className={labelClass}>
                Price (IDR){" "}
                <span className="text-[var(--color-low-stock)]">*</span>
              </label>
              <input
                id="create-product-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.price)}
              />
              {errors.price && <p className={errorClass}>{errors.price}</p>}
            </div>

            <div>
              <label htmlFor="create-product-stock" className={labelClass}>
                Stock <span className="text-[var(--color-low-stock)]">*</span>
              </label>
              <input
                id="create-product-stock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.stock)}
              />
              {errors.stock && <p className={errorClass}>{errors.stock}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="create-product-description" className={labelClass}>
              Description <span className="text-[var(--color-low-stock)]">*</span>
            </label>
            <textarea
              id="create-product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${inputClass} resize-y`}
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description && (
              <p className={errorClass}>{errors.description}</p>
            )}
          </div>

          <ProductImagesManager
            mode="create"
            idPrefix="create"
            pending={pendingImages}
            onPendingChange={setPendingImages}
          />

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Add product"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
