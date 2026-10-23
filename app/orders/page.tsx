"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { getOrders } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { errorMessage } from "@/lib/toast";
import type { Order } from "@/lib/types";

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bump to re-trigger the fetch effect (used by the retry button).
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch orders on mount / retry. The request lives inside the effect with a
  // cancellation guard so stale responses don't update unmounted state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrders({ page: 1 });
        if (cancelled) return;
        setOrders(data.orders);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err, "Could not load your orders."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <section className="flex flex-col gap-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--color-brand)]">
            Home
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <span className="font-medium text-slate-700">Orders</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Your Orders
        </h1>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
          >
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-hairline)] bg-white px-6 py-16 text-center">
          <span className="text-5xl" aria-hidden>
            📦
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No orders yet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            When you place an order, it will show up here.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => {
            const units = order.order_items.reduce(
              (sum, item) => sum + item.quantity,
              0
            );
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-hairline)] bg-white px-5 py-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900">
                      Order #{order.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(order.created_at)} · {units}{" "}
                      {units === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <OrderStatusBadge status={order.status} />
                    <span className="font-bold text-slate-900">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute requireRole="customer">
      <OrdersContent />
    </ProtectedRoute>
  );
}
