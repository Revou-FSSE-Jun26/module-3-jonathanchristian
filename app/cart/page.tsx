"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../components/ProtectedRoute";
import ProductImage from "../components/ProductImage";
import QuantityStepper from "../components/QuantityStepper";
import { useCart } from "@/lib/cart-context";
import { formatPrice, priceToNumber } from "@/lib/format";

function CartContent() {
  const router = useRouter();
  const { items, total, itemCount, setQuantity, removeFromCart, clearCart } =
    useCart();

  const isEmpty = items.length === 0;

  return (
    <section className="flex flex-col gap-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--color-brand)]">
            Home
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <span className="font-medium text-slate-700">Cart</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Your Cart
        </h1>
        <p className="text-sm text-slate-500">
          {itemCount} {itemCount === 1 ? "item" : "items"} in your bag.
        </p>
      </header>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-hairline)] bg-white px-6 py-16 text-center">
          <span className="text-5xl" aria-hidden>
            🛒
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Your cart is empty
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Browse the catalogue and add some gear.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
          >
            Shop products
          </Link>
        </div>
      ) : (
        <>
          {/* Items table (desktop) */}
          <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white">
            <table className="hidden w-full text-left text-sm sm:table">
              <thead className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Quantity</th>
                  <th className="px-5 py-3 text-right font-semibold">Subtotal</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-hairline)]">
                {items.map(({ product, quantity }) => (
                  <tr key={product.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          product={product}
                          className="h-12 w-12 shrink-0 rounded-lg"
                          textClassName="text-sm"
                        />
                        <Link
                          href={`/products/${product.id}`}
                          className="font-semibold text-slate-900 hover:text-[var(--color-brand)]"
                        >
                          {product.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-5 py-4">
                      <QuantityStepper
                        value={quantity}
                        onChange={(next) => setQuantity(product.id, next)}
                        min={1}
                        max={product.stock > 0 ? product.stock : undefined}
                        label={`${product.name} quantity`}
                      />
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {formatPrice(priceToNumber(product.price) * quantity)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`Remove ${product.name} from cart`}
                        className="text-xs font-medium text-slate-400 transition-colors hover:text-[var(--color-low-stock)]"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Items list (mobile) */}
            <ul className="divide-y divide-[var(--color-hairline)] sm:hidden">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-3 p-4">
                  <ProductImage
                    product={product}
                    className="h-16 w-16 shrink-0 rounded-xl"
                    textClassName="text-lg"
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${product.id}`}
                        className="line-clamp-1 text-sm font-semibold text-slate-900"
                      >
                        {product.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`Remove ${product.name} from cart`}
                        className="text-xs font-medium text-slate-400 hover:text-[var(--color-low-stock)]"
                      >
                        Remove
                      </button>
                    </div>
                    <span className="text-sm text-slate-500">
                      {formatPrice(product.price)}
                    </span>
                    <div className="mt-1 flex items-center justify-between">
                      <QuantityStepper
                        value={quantity}
                        onChange={(next) => setQuantity(product.id, next)}
                        min={1}
                        max={product.stock > 0 ? product.stock : undefined}
                        label={`${product.name} quantity`}
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        {formatPrice(priceToNumber(product.price) * quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Summary */}
          <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-[var(--color-hairline)] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-slate-500">Total</span>
              <span className="text-2xl font-bold text-slate-900">
                {formatPrice(total)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearCart}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-[var(--color-canvas-alt)]"
              >
                Clear cart
              </button>
              <button
                type="button"
                onClick={() => router.push("/checkout")}
                disabled={isEmpty}
                className="rounded-full bg-[var(--color-brand)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Proceed to checkout
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default function CartPage() {
  return (
    <ProtectedRoute requireRole="customer">
      <CartContent />
    </ProtectedRoute>
  );
}
