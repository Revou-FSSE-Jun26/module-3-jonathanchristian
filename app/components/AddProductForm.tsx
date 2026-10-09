"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";

export interface AddProductFormProps {
  onAdd: (product: Product) => void;
}

interface FieldErrors {
  name?: string;
  price?: string;
  stock?: string;
}

export default function AddProductForm({ onAdd }: AddProductFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) {
      next.name = "Name is required.";
    } else if (name.trim().length < 2) {
      next.name = "Name must be at least 2 characters.";
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setStock("");
    setErrors({});
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(false);
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const newProduct: Product = {
      id: -Date.now(),
      name: name.trim(),
      description: description.trim(),
      price: Number.parseFloat(price).toFixed(2),
      stock: Number.parseInt(stock, 10),
      created_at: new Date().toISOString(),
    };

    onAdd(newProduct);
    resetForm();
    setSuccess(true);
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20";

  return (
    <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Add a product
          </h2>
          <p className="text-sm text-slate-500">
            Adds to this list locally — nothing is sent to the API.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
            setSuccess(false);
          }}
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
              <label
                htmlFor="product-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Name <span className="text-[var(--color-low-stock)]">*</span>
              </label>
              <input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-[var(--color-low-stock)]">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="product-price"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Price (IDR){" "}
                <span className="text-[var(--color-low-stock)]">*</span>
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.price)}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-[var(--color-low-stock)]">
                  {errors.price}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="product-stock"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Stock <span className="text-[var(--color-low-stock)]">*</span>
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.stock)}
              />
              {errors.stock && (
                <p className="mt-1 text-xs text-[var(--color-low-stock)]">
                  {errors.stock}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="product-description"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Description
              </label>
              <input
                id="product-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
            >
              Add product
            </button>
            {success && (
              <span
                className="text-sm font-medium text-[var(--color-in-stock)]"
                role="status"
              >
                Product added to the list.
              </span>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
