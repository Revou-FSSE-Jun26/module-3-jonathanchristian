"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import CartDrawer from "./CartDrawer";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/orders", label: "Orders" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-[var(--color-hairline)] bg-white/80 px-4 py-3 shadow-xl backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-base font-black text-white">
              R
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              RevoShop
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-[var(--color-canvas-alt)]"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 rounded-full border border-[var(--color-hairline)] px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--color-canvas-alt)]"
            aria-label={`Open cart, ${itemCount} items`}
          >
            <span aria-hidden>🛒</span>
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-xs font-bold text-slate-900">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile nav row */}
        <nav className="mx-auto mt-2 flex max-w-6xl items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--color-hairline)] bg-white/80 px-2 py-2 shadow-md backdrop-blur-md sm:hidden">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "whitespace-nowrap rounded-full bg-[var(--color-brand)] px-3 py-1.5 text-sm font-semibold text-white"
                    : "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-slate-600"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
