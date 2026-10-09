"use client";

// Frontend-only cart. State lives in React context so it stays consistent
// while navigating within the app. All updates are immutable. No backend
// persistence is involved for this checkpoint.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "./types";
import { priceToNumber } from "./format";

interface CartContextValue {
  items: CartItem[];
  /** Total number of units across all line items. */
  itemCount: number;
  /** Sum of price * quantity across all line items. */
  total: number;
  /** Add a quantity of a product (defaults to 1). Clamped to stock. */
  addToCart: (product: Product, quantity?: number) => void;
  /** Set an exact quantity for a product; 0 removes it. */
  setQuantity: (productId: number, quantity: number) => void;
  /** Remove a product from the cart entirely. */
  removeFromCart: (productId: number) => void;
  /** Empty the cart. */
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (quantity <= 0) return;
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const maxStock =
        typeof product.stock === "number" ? product.stock : Infinity;

      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, maxStock);
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: nextQty }
            : item
        );
      }

      const nextQty = Math.min(quantity, maxStock);
      if (nextQty <= 0) return prev;
      return [...prev, { product, quantity: nextQty }];
    });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) => {
        if (item.product.id !== productId) return item;
        const maxStock =
          typeof item.product.stock === "number"
            ? item.product.stock
            : Infinity;
        return { ...item, quantity: Math.min(quantity, maxStock) };
      });
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const { itemCount, total } = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.itemCount += item.quantity;
        acc.total += priceToNumber(item.product.price) * item.quantity;
        return acc;
      },
      { itemCount: 0, total: 0 }
    );
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      total,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
    }),
    [items, itemCount, total, addToCart, setQuantity, removeFromCart, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider.");
  }
  return ctx;
}
