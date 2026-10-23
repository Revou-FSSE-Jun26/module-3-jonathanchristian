"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice, stockLabel, stockLevel } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import Card from "./Card";
import ProductImage from "./ProductImage";
import AddToCartButton from "./AddToCartButton";

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
  const { isAuthenticated, role, loading } = useAuth();
  const level = stockLevel(product.stock);

  /**
   * Buy action depends on who's viewing:
   * - guest  → "Login to buy" link
   * - customer → Add to Cart
   * - admin  → no buy control (admins manage the catalogue, they don't shop)
   */
  const renderAction = () => {
    if (loading) {
      // During auth hydration, reserve space to avoid layout shift.
      return <div className="h-9" aria-hidden />;
    }
    if (!isAuthenticated) {
      return (
        <Link
          href="/login"
          className="block w-full rounded-full border border-[var(--color-brand)] px-4 py-2 text-center text-sm font-semibold text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)] hover:text-white"
        >
          Login to buy
        </Link>
      );
    }
    if (role === "admin") {
      return null;
    }
    return <AddToCartButton product={product} />;
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

        {showControls && <div className="mt-1">{renderAction()}</div>}
      </div>
    </Card>
  );
}
