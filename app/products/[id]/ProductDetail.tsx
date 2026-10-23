"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { stockLabel, stockLevel } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import AddToCartButton from "../../components/AddToCartButton";

const STOCK_STYLES = {
  in: "bg-green-50 text-[var(--color-in-stock)]",
  low: "bg-orange-50 text-[var(--color-low-stock)]",
  out: "bg-slate-100 text-slate-500",
} as const;

export default function ProductDetail({ product }: { product: Product }) {
  const { isAuthenticated, role, loading } = useAuth();
  const level = stockLevel(product.stock);

  const renderAction = () => {
    if (loading) {
      return <div className="h-12" aria-hidden />;
    }
    if (!isAuthenticated) {
      return (
        <Link
          href="/login"
          className="inline-block rounded-full border border-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)] hover:text-white"
        >
          Login to buy
        </Link>
      );
    }
    if (role === "admin") {
      return (
        <p className="text-sm text-slate-500">
          You&apos;re signed in as an admin. Manage this product from the{" "}
          <Link
            href="/dashboard"
            className="font-semibold text-[var(--color-brand)] hover:underline"
          >
            dashboard
          </Link>
          .
        </p>
      );
    }
    return <AddToCartButton product={product} size="lg" />;
  };

  return (
    <div className="flex flex-col gap-4">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${STOCK_STYLES[level]}`}
      >
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
        {stockLabel(product.stock)}
      </span>

      {renderAction()}
    </div>
  );
}
