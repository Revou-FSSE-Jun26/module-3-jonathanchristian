"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { stockLevel } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { notifySuccess } from "@/lib/toast";
import QuantityStepper from "./QuantityStepper";

export interface AddToCartButtonProps {
  product: Product;
  /** Larger paddings for the product detail page. */
  size?: "sm" | "lg";
}

/**
 * Quantity stepper + "Add to Cart" action for a customer. Clamps to stock,
 * resets the quantity after adding, and shows a success toast.
 */
export default function AddToCartButton({
  product,
  size = "sm",
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const outOfStock = stockLevel(product.stock) === "out";

  const handleAdd = () => {
    if (outOfStock) return;
    addToCart(product, quantity);
    setQuantity(1);
    notifySuccess(`${product.name} added to cart.`);
  };

  const padding = size === "lg" ? "px-6 py-3" : "px-4 py-2";

  return (
    <div className="flex items-center gap-2">
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
            ? `flex-1 cursor-not-allowed rounded-full bg-slate-100 ${padding} text-sm font-semibold text-slate-400`
            : `flex-1 rounded-full bg-[var(--color-brand)] ${padding} text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]`
        }
      >
        {outOfStock ? "Sold out" : "Add to Cart"}
      </button>
    </div>
  );
}
