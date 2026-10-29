"use client";

import { useState } from "react";
import type {
  Category,
  Product,
  ProductImage,
  UpdateProductRequest,
} from "@/lib/types";
import { updateProduct } from "@/lib/api";
import { notifySuccess, notifyFromError } from "@/lib/toast";
import ProductImagesManager from "./ProductImagesManager";

export interface EditProductFormProps {
  product: Product;
  categories: Category[];
  /** Called after the product fields are saved (closes the editor). */
  onUpdated: (product: Product) => void;
  /**
   * Called when the product's images change (add/replace/delete). Updates the
   * dashboard row WITHOUT closing the editor, so the admin can keep editing.
   */
  onImagesChange?: (product: Product) => void;
  onCancel: () => void;
}

interface FieldErrors {
  name?: string;
  description?: string;
  price?: string;
  stock?: string;
}

const inputClass =
  "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const errorClass = "mt-1 text-xs text-[var(--color-low-stock)]";

export default function EditProductForm({
  product,
  categories,
  onUpdated,
  onImagesChange,
  onCancel,
}: EditProductFormProps) {
  const [categoryId, setCategoryId] = useState(
    product.category_id ? String(product.category_id) : ""
  );
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(String(Number.parseFloat(product.price)));
  const [stock, setStock] = useState(String(product.stock));
  const [images, setImages] = useState<ProductImage[]>(product.images ?? []);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Image add/replace/delete hit the backend immediately. Propagate the new
  // image list to the dashboard row right away so the thumbnail stays current,
  // independent of the product-fields "Save changes" action.
  const handleImagesChange = (next: ProductImage[]) => {
    setImages(next);
    onImagesChange?.({ ...product, images: next });
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
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

    // Only send fields that actually changed.
    const payload: UpdateProductRequest = {};
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const priceValue = Number.parseFloat(price);
    const stockValue = Number.parseInt(stock, 10);

    if (trimmedName !== product.name) payload.name = trimmedName;
    if (trimmedDesc !== (product.description ?? "")) {
      payload.description = trimmedDesc;
    }
    if (priceValue !== Number.parseFloat(product.price)) {
      payload.price = priceValue;
    }
    if (stockValue !== product.stock) payload.stock = stockValue;
    if (categoryId && Number.parseInt(categoryId, 10) !== product.category_id) {
      payload.category_id = Number.parseInt(categoryId, 10);
    }

    if (Object.keys(payload).length === 0) {
      onCancel();
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateProduct(product.id, payload);
      // Preserve the live image list (managed separately via immediate calls).
      onUpdated({ ...updated, images });
      notifySuccess(`"${updated.name}" updated.`);
    } catch (err) {
      notifyFromError(err, "Could not update the product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-4 rounded-2xl border border-[var(--color-brand)]/30 bg-[var(--color-canvas)] p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`edit-category-${product.id}`} className={labelClass}>
            Category
          </label>
          <select
            id={`edit-category-${product.id}`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            <option value="">Unchanged</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`edit-name-${product.id}`} className={labelClass}>
            Name <span className="text-[var(--color-low-stock)]">*</span>
          </label>
          <input
            id={`edit-name-${product.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor={`edit-price-${product.id}`} className={labelClass}>
            Price (IDR) <span className="text-[var(--color-low-stock)]">*</span>
          </label>
          <input
            id={`edit-price-${product.id}`}
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
          <label htmlFor={`edit-stock-${product.id}`} className={labelClass}>
            Stock <span className="text-[var(--color-low-stock)]">*</span>
          </label>
          <input
            id={`edit-stock-${product.id}`}
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
        <label htmlFor={`edit-desc-${product.id}`} className={labelClass}>
          Description <span className="text-[var(--color-low-stock)]">*</span>
        </label>
        <textarea
          id={`edit-desc-${product.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`${inputClass} resize-y`}
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description && <p className={errorClass}>{errors.description}</p>}
      </div>

      <ProductImagesManager
        mode="edit"
        idPrefix={`edit-${product.id}`}
        productId={product.id}
        images={images}
        onImagesChange={handleImagesChange}
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-[var(--color-canvas-alt)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
