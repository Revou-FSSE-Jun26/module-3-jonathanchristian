import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export interface ProductGridProps {
  products: Product[];
  emptyMessage?: string;
  featuredCount?: number;
}

export default function ProductGrid({
  products,
  emptyMessage = "No products found.",
  featuredCount = 0,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-hairline)] bg-white px-6 py-16 text-center">
        <span className="text-3xl" aria-hidden>
          🔍
        </span>
        <p className="mt-3 font-semibold text-slate-700">{emptyMessage}</p>
        <p className="mt-1 text-sm text-slate-500">
          Try adjusting your search or category filter.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          featured={index < featuredCount}
        />
      ))}
    </div>
  );
}
