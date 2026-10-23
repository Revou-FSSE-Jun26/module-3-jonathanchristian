"use client";

// Frontend cart, persisted to localStorage so it survives refreshes and stays
// in sync across tabs. State is backed by an external store read via
// useSyncExternalStore (same pattern as the auth context) to keep SSR +
// hydration correct. All updates are immutable. The cart itself is never sent
// to the backend; it is converted into an order only at checkout.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "./types";
import { priceToNumber } from "./format";

const STORAGE_KEY = "revoshop.cart";

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

// ---------------------------------------------------------------------------
// External cart store (localStorage-backed)
// ---------------------------------------------------------------------------

const EMPTY: CartItem[] = [];

function parseItems(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    // Keep only well-formed entries.
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item === "object" &&
        item.product &&
        typeof item.product.id === "number" &&
        typeof item.quantity === "number" &&
        item.quantity > 0
    );
  } catch {
    return EMPTY;
  }
}

let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function getSnapshot(): CartItem[] {
  const raw = readRaw();
  if (!hydrated || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parseItems(raw);
    hydrated = true;
  }
  return cachedItems;
}

/** Server render (and first client render) starts with an empty cart. */
function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedRaw = "\u0000__stale__";
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeItems(next: CartItem[]): void {
  if (typeof window !== "undefined") {
    if (next.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  cachedRaw = next.length > 0 ? JSON.stringify(next) : null;
  cachedItems = next;
  hydrated = true;
  emit();
}

/** Apply an immutable update to the current items and persist the result. */
function updateItems(updater: (prev: CartItem[]) => CartItem[]): void {
  writeItems(updater(getSnapshot()));
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (quantity <= 0) return;
    updateItems((prev) => {
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
    updateItems((prev) => {
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
    updateItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => writeItems(EMPTY), []);

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
