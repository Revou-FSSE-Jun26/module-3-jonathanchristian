"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import DeliveryDetails from "../../components/DeliveryDetails";
import { getOrder, getProduct, updateOrderStatus, createPayment } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { notifySuccess, notifyFromError, errorMessage } from "@/lib/toast";
import type { Order } from "@/lib/types";

/** Resolve product names for the order's line items (best-effort). */
async function resolveNames(order: Order): Promise<Record<number, string>> {
  const ids = Array.from(new Set(order.order_items.map((i) => i.product_id)));
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const product = await getProduct(id);
        return [id, product?.name ?? `Product #${id}`] as const;
      } catch {
        return [id, `Product #${id}`] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

function OrderDetailContent({ orderId }: { orderId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [names, setNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  // Fetch the order on mount. The request lives inside the effect with a
  // cancellation guard so stale responses don't touch unmounted state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrder(orderId);
        if (cancelled) return;
        setOrder(data);
        const resolved = await resolveNames(data);
        if (cancelled) return;
        setNames(resolved);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err, "Could not load this order."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // If we arrived back from Midtrans (?payment=success|...), surface a toast
  // once. The real status comes from the webhook-updated order we just loaded.
  const paymentNotified = useRef(false);
  useEffect(() => {
    if (paymentNotified.current) return;
    const payment = searchParams.get("payment");
    if (payment) {
      paymentNotified.current = true;
      if (payment === "success" || payment === "settlement") {
        notifySuccess("Payment received. Thank you!");
      }
      // Clean the query string so a refresh doesn't re-toast.
      router.replace(`/orders/${orderId}`);
    }
  }, [searchParams, orderId, router]);

  const handleCancel = async () => {
    if (!order) return;
    setActing(true);
    try {
      const updated = await updateOrderStatus(order.id, "cancelled");
      setOrder(updated);
      notifySuccess("Order cancelled.");
    } catch (err) {
      notifyFromError(err, "Could not cancel the order.");
    } finally {
      setActing(false);
    }
  };

  const handlePay = async () => {
    if (!order) return;
    setActing(true);
    try {
      const payment = await createPayment(order.id);
      notifySuccess("Redirecting to payment…");
      window.location.href = payment.redirect_url;
    } catch (err) {
      notifyFromError(err, "Could not start payment.");
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white" />
        <div className="h-48 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
        <p className="text-sm font-medium text-red-700">
          {error ?? "Order not found."}
        </p>
        <Link
          href="/orders"
          className="mt-4 rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  const isPending = order.status === "pending";

  return (
    <section className="flex flex-col gap-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--color-brand)]">
            Home
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <Link href="/orders" className="hover:text-[var(--color-brand)]">
            Orders
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <span className="font-medium text-slate-700">Order #{order.id}</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Order #{order.id}
            </h1>
            <p className="text-sm text-slate-500">
              Placed {formatDate(order.created_at)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 font-semibold">Unit price</th>
              <th className="px-5 py-3 font-semibold">Qty</th>
              <th className="px-5 py-3 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-hairline)]">
            {order.order_items.map((item) => (
              <tr key={item.product_id}>
                <td className="px-5 py-4">
                  <Link
                    href={`/products/${item.product_id}`}
                    className="font-semibold text-slate-900 hover:text-[var(--color-brand)]"
                  >
                    {names[item.product_id] ?? `Product #${item.product_id}`}
                  </Link>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {formatPrice(item.unit_price)}
                </td>
                <td className="px-5 py-4 text-slate-600">{item.quantity}</td>
                <td className="px-5 py-4 text-right font-semibold text-slate-900">
                  {formatPrice(item.unit_price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-[var(--color-hairline)] bg-[var(--color-canvas)] px-5 py-4">
          <span className="text-sm font-medium text-slate-500">Total</span>
          <span className="text-xl font-bold text-slate-900">
            {formatPrice(order.total_amount)}
          </span>
        </div>
      </div>

      <DeliveryDetails order={order} />

      {isPending && (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={acting}
            className="rounded-full border border-[var(--color-hairline)] px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-[var(--color-canvas-alt)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel order
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={acting}
            className="rounded-full bg-[var(--color-brand)] px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {acting ? "Please wait…" : `Pay ${formatPrice(order.total_amount)}`}
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Resolves the route params inside the Suspense boundary. Reading `params`
 * (and useSearchParams inside the content) must happen within <Suspense> so
 * the route is not blocked from prerendering under Cache Components.
 */
function OrderDetailResolver({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number.parseInt(id, 10);

  if (!Number.isInteger(orderId)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-hairline)] bg-white px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-600">Invalid order id.</p>
        <Link
          href="/orders"
          className="mt-4 rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  return <OrderDetailContent orderId={orderId} />;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ProtectedRoute requireRole="customer">
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-white" />
            <div className="h-48 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white" />
          </div>
        }
      >
        <OrderDetailResolver params={params} />
      </Suspense>
    </ProtectedRoute>
  );
}
