"use client";

import { Fragment, useEffect, useState } from "react";
import {
  getOrders,
  getProduct,
  updateOrderStatus,
  deleteOrder,
  ApiError,
} from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { notifySuccess, notifyFromError, errorMessage } from "@/lib/toast";
import type {
  Order,
  OrderStatus,
  Pagination as PaginationMeta,
} from "@/lib/types";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import DeliveryDetails from "../../components/DeliveryDetails";
import Pagination from "../../components/Pagination";

/**
 * Admin forward-only status transitions, mirroring the backend rules.
 * `completed` and `cancelled` are terminal (no further transitions).
 */
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["delivering", "cancelled"],
  delivering: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Product names cached across expansions (best-effort; falls back to id).
  const [names, setNames] = useState<Record<number, string>>({});

  // When an order is expanded, resolve names for any products not yet cached.
  useEffect(() => {
    if (expandedId === null) return;
    const order = orders.find((o) => o.id === expandedId);
    if (!order) return;
    const missing = Array.from(
      new Set(order.order_items.map((i) => i.product_id))
    ).filter((id) => !(id in names));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const product = await getProduct(id);
            return [id, product?.name ?? `Product #${id}`] as const;
          } catch {
            return [id, `Product #${id}`] as const;
          }
        })
      );
      if (!cancelled) {
        setNames((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expandedId, orders, names]);

  // Fetch the current page on mount, page change, retry, or after a delete.
  // `loading` is switched on by the triggering action (not here), so a
  // post-delete refetch updates the table in place without a skeleton flash.
  useEffect(() => {
    let cancelled = false;
    let steppingBack = false;
    (async () => {
      try {
        const data = await getOrders({ page });
        if (cancelled) return;
        // If the page no longer exists (e.g. its last order was deleted),
        // step back to the new last page; the effect re-runs for it.
        const lastPage = Math.max(data.pagination?.total_pages ?? 1, 1);
        if (data.orders.length === 0 && page > lastPage) {
          steppingBack = true;
          setLoading(true);
          setPage(lastPage);
          return;
        }
        setOrders(data.orders);
        setPagination(data.pagination ?? null);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err, "Could not load orders."));
      } finally {
        // Keep the current view until the stepped-back page arrives.
        if (!cancelled && !steppingBack) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  const totalPages = pagination?.total_pages ?? 1;

  const changePage = (next: number) => {
    if (next === page) return;
    setLoading(true);
    setExpandedId(null);
    setPage(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    setBusyId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o))
      );
      notifySuccess(`Order #${order.id} set to ${status}.`);
    } catch (err) {
      notifyFromError(err, "Could not update the order status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (order: Order) => {
    // UI restricts deletion to cancelled orders (stricter than the backend).
    if (order.status !== "cancelled") return;
    const confirmed = window.confirm(
      `Delete cancelled order #${order.id}? This cannot be undone.`
    );
    if (!confirmed) return;

    setBusyId(order.id);
    try {
      await deleteOrder(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      if (expandedId === order.id) setExpandedId(null);
      // Refetch so the page backfills from the next one and totals stay right.
      setReloadKey((k) => k + 1);
      notifySuccess(`Order #${order.id} deleted.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        notifyFromError(err, "Can't delete this order in its current state.");
      } else {
        notifyFromError(err, "Could not delete the order.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">All orders</h2>
        <p className="text-sm text-slate-500">
          Read-only overview across all customers. You can advance an order&apos;s
          status or delete a cancelled order.
        </p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white" />
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
        <div className="rounded-2xl border border-dashed border-[var(--color-hairline)] bg-white px-6 py-16 text-center text-slate-500">
          No orders yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Total</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {orders.map((order) => {
                const nextStatuses = NEXT_STATUSES[order.status];
                const units = order.order_items.reduce(
                  (sum, i) => sum + i.quantity,
                  0
                );
                return (
                  <Fragment key={order.id}>
                    <tr>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((id) =>
                              id === order.id ? null : order.id
                            )
                          }
                          aria-expanded={expandedId === order.id}
                          aria-controls={`order-details-${order.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-[var(--color-brand)]"
                        >
                          #{order.id}
                          <span aria-hidden className="text-xs text-slate-400">
                            {expandedId === order.id ? "▲" : "▼"}
                          </span>
                          <span className="sr-only">
                            {expandedId === order.id
                              ? "Hide details"
                              : "Show details"}
                          </span>
                        </button>
                        <p className="text-xs text-slate-500">
                          {formatDate(order.created_at)} · {units}{" "}
                          {units === 1 ? "item" : "items"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p className="font-medium text-slate-900">
                          {order.customer_name?.trim() || `User #${order.user_id}`}
                        </p>
                        {order.customer_email && (
                          <p className="text-xs text-slate-500">
                            {order.customer_email}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatPrice(order.total_amount)}
                      </td>
                      <td className="px-5 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {nextStatuses.length > 0 && (
                            <select
                              aria-label={`Update status for order ${order.id}`}
                              value=""
                              disabled={busyId === order.id}
                              onChange={(e) => {
                                const value = e.target.value as OrderStatus;
                                if (value) handleStatusChange(order, value);
                              }}
                              className="rounded-full border border-[var(--color-hairline)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-[var(--color-brand)] focus:outline-none"
                            >
                              <option value="">Set status…</option>
                              {nextStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          )}
                          {order.status === "cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleDelete(order)}
                              disabled={busyId === order.id}
                              className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr>
                        <td
                          id={`order-details-${order.id}`}
                          colSpan={5}
                          className="bg-[var(--color-canvas)] px-5 py-4"
                        >
                          <div className="flex flex-col gap-4">
                            <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white">
                              <table className="w-full text-left text-sm">
                                <caption className="sr-only">
                                  Items in order #{order.id}
                                </caption>
                                <thead className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] text-xs uppercase tracking-wide text-slate-500">
                                  <tr>
                                    <th className="px-5 py-3 font-semibold">Product</th>
                                    <th className="px-5 py-3 font-semibold">Unit price</th>
                                    <th className="px-5 py-3 font-semibold">Qty</th>
                                    <th className="px-5 py-3 text-right font-semibold">
                                      Subtotal
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-hairline)]">
                                  {order.order_items.map((item) => (
                                    <tr key={item.product_id}>
                                      <td className="px-5 py-3 font-medium text-slate-900">
                                        {names[item.product_id] ??
                                          `Product #${item.product_id}`}
                                      </td>
                                      <td className="px-5 py-3 tabular-nums text-slate-600">
                                        {formatPrice(item.unit_price)}
                                      </td>
                                      <td className="px-5 py-3 tabular-nums text-slate-600">
                                        {item.quantity}
                                      </td>
                                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
                                        {formatPrice(item.unit_price * item.quantity)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="flex items-center justify-between border-t border-[var(--color-hairline)] bg-[var(--color-canvas)] px-5 py-3">
                                <span className="text-sm font-medium text-slate-500">
                                  Total
                                </span>
                                <span className="text-base font-bold tabular-nums text-slate-900">
                                  {formatPrice(order.total_amount)}
                                </span>
                              </div>
                            </div>
                            <DeliveryDetails order={order} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!error && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={changePage}
          disabled={loading}
        />
      )}
    </div>
  );
}
