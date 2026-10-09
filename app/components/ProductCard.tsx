"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice, stockLabel, stockLevel } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import Card from "./Card";
import ProductImage from "./ProductImage";
import QuantityStepper from "./QuantityStepper";

export interface ProductCardProps {
  product: Product;
  showControls?: boolean;
  featured?: boolean;
}

const STOCK_STYLES: Record<ReturnType<typeof stockLevel>, string> = {
  in: "text-[var(--color-in-stock)]",
  low: "text-[var(--color-low-stock)]",
  out: "text-slate-400",
};

export default function ProductCard({
  product,
  showControls = true,
  featured = false,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const level = stockLevel(product.stock);
  const outOfStock = level === "out";

  const handleAdd = () => {
    if (outOfStock) return;
    addToCart(product, quantity);
    setQuantity(1);
  };

  return (
    <Card interactive className="flex flex-col overflow-hidden">
      <div className="relative">
        <Link href={`/products/${product.id}`} aria-label={`View ${product.name}`}>
          <ProductImage product={product} />
        </Link>
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-bold text-slate-900">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <Link
            href={`/products/${product.id}`}
            className="line-clamp-2 font-semibold text-slate-900 transition-colors hover:text-[var(--color-brand)]"
          >
            {product.name}
          </Link>
          {product.description && (
            <p className="mt-1 line-clamp-1 text-sm text-slate-500">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">
            {formatPrice(product.price)}
          </span>
          <span className={`text-xs font-semibold ${STOCK_STYLES[level]}`}>
            {stockLabel(product.stock)}
          </span>
        </div>

        {showControls && (
          <div className="mt-1 flex items-center gap-2">
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
                  ? "flex-1 cursor-not-allowed rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400"
                  : "flex-1 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
              }
            >
              {outOfStock ? "Sold out" : "Add to Cart"}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
