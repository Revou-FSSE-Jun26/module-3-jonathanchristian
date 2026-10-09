"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { stockLabel, stockLevel } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import QuantityStepper from "../../components/QuantityStepper";

const STOCK_STYLES = {
  in: "bg-green-50 text-[var(--color-in-stock)]",
  low: "bg-orange-50 text-[var(--color-low-stock)]",
  out: "bg-slate-100 text-slate-500",
} as const;

export default function ProductDetail({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const level = stockLevel(product.stock);
  const outOfStock = level === "out";

  const handleAdd = () => {
    if (outOfStock) return;
    addToCart(product, quantity);
    setAdded(true);
    setQuantity(1);
    window.setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${STOCK_STYLES[level]}`}
      >
        <span
          className="h-2 w-2 rounded-full bg-current"
          aria-hidden
        />
        {stockLabel(product.stock)}
      </span>

      <div className="flex items-center gap-4">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={product.stock > 0 ? product.stock : undefined}
          disabled={outOfStock}
          label={`${product.name} quantity`}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className={
            outOfStock
              ? "flex-1 cursor-not-allowed rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-400"
              : "flex-1 rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
          }
        >
          {outOfStock ? "Sold out" : "Add to Cart"}
        </button>
      </div>

      {added && (
        <p
          className="text-sm font-medium text-[var(--color-in-stock)]"
          role="status"
        >
          Added to your cart.
        </p>
      )}
    </div>
  );
}
