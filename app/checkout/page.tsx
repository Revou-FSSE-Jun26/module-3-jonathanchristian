"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../components/ProtectedRoute";
import ProductImage from "../components/ProductImage";
import { useCart } from "@/lib/cart-context";
import { formatPrice, priceToNumber } from "@/lib/format";
import { createOrder, createPayment } from "@/lib/api";
import { notifySuccess, notifyFromError, errorMessage } from "@/lib/toast";

function CheckoutContent() {
  const router = useRouter();
  const { items, total, itemCount, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = items.length === 0;

  // Nothing to check out — bounce back to the cart.
  useEffect(() => {
    if (isEmpty && !submitting) {
      router.replace("/cart");
    }
  }, [isEmpty, submitting, router]);

  const handlePay = async () => {
    if (isEmpty) return;
    setError(null);
    setSubmitting(true);

    // Snapshot the order items before clearing the cart.
    const orderItems = items.map(({ product, quantity }) => ({
      product_id: product.id,
      quantity,
    }));

    let orderId: number;
    try {
      const order = await createOrder({ order_items: orderItems });
      orderId = order.id;
      // Order is created server-side; clear the local cart so it isn't
      // re-submitted.
      clearCart();
    } catch (err) {
      setError(errorMessage(err, "Could not place your order."));
      notifyFromError(err, "Could not place your order.");
      setSubmitting(false);
      return;
    }

    // Order placed. Now create the Midtrans payment and redirect to Snap.
    try {
      const payment = await createPayment(orderId);
      notifySuccess("Order placed. Redirecting to payment…");
      // Hand off to Midtrans Snap. After payment, Midtrans returns the user to
      // the order detail page (configured on the Midtrans/backend side).
      window.location.href = payment.redirect_url;
    } catch (err) {
      // Order exists but payment couldn't start — send the user to the order
      // detail page to retry Pay from there.
      notifyFromError(err, "Order placed, but payment couldn't start. You can retry from the order page.");
      router.replace(`/orders/${orderId}`);
    }
  };

  if (isEmpty) {
    return null;
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--color-brand)]">
            Home
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <Link href="/cart" className="hover:text-[var(--color-brand)]">
            Cart
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <span className="font-medium text-slate-700">Checkout</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Checkout
        </h1>
        <p className="text-sm text-slate-500">
          Review your order, then continue to secure payment.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white">
        <ul className="divide-y divide-[var(--color-hairline)]">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="flex items-center gap-3 p-4">
              <ProductImage
                product={product}
                className="h-12 w-12 shrink-0 rounded-lg"
                textClassName="text-sm"
              />
              <div className="flex flex-1 items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPrice(product.price)} × {quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatPrice(priceToNumber(product.price) * quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-4">
          <span className="text-sm font-medium text-slate-500">
            Total ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className="text-xl font-bold text-slate-900">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/cart"
          className="rounded-full px-5 py-2.5 text-center text-sm font-medium text-slate-500 transition-colors hover:bg-[var(--color-canvas-alt)]"
        >
          Back to cart
        </Link>
        <button
          type="button"
          onClick={handlePay}
          disabled={submitting}
          className="rounded-full bg-[var(--color-brand)] px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Processing…" : `Pay ${formatPrice(total)}`}
        </button>
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute requireRole="customer">
      <CheckoutContent />
    </ProtectedRoute>
  );
}
