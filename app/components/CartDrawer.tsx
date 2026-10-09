"use client";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import ProductImage from "./ProductImage";
import QuantityStepper from "./QuantityStepper";

export interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, itemCount, total, setQuantity, removeFromCart, clearCart } =
    useCart();

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            Your Cart{" "}
            <span className="text-sm font-medium text-slate-500">
              ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-[var(--color-canvas-alt)]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="text-4xl" aria-hidden>
                🛒
              </span>
              <p className="mt-3 font-semibold text-slate-700">
                Your cart is empty
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add some gear to get started.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-3">
                  <ProductImage
                    product={product}
                    className="h-16 w-16 shrink-0 rounded-xl"
                    textClassName="text-lg"
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-sm font-semibold text-slate-900">
                        {product.name}
                      </span>
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
                    <div className="mt-1">
                      <QuantityStepper
                        value={quantity}
                        onChange={(next) => setQuantity(product.id, next)}
                        min={1}
                        max={product.stock > 0 ? product.stock : undefined}
                        label={`${product.name} quantity`}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--color-hairline)] px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total</span>
            <span className="text-xl font-bold text-slate-900">
              {formatPrice(total)}
            </span>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            className="w-full rounded-full bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Checkout
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="mt-2 w-full rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-[var(--color-canvas-alt)]"
            >
              Clear cart
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
