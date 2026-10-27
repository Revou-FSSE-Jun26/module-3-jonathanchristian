"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { notifySuccess } from "@/lib/toast";
import CartDrawer from "./CartDrawer";

const BASE_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();
  const { isAuthenticated, name, role, loading, logout } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // The cart is hidden from admins (they can't check out). Customers and guests
  // both see it; a guest who opens it is prompted to log in before buying.
  // Hidden while auth is resolving to avoid a flash.
  const canUseCart = !loading && role !== "admin";

  // Build the nav based on role: customers see Orders; admins see Dashboard.
  const navLinks = [
    ...BASE_NAV_LINKS,
    ...(isAuthenticated && role === "customer"
      ? [{ href: "/orders", label: "Orders" } as const]
      : []),
    ...(isAuthenticated && role === "admin"
      ? [{ href: "/dashboard", label: "Dashboard" } as const]
      : []),
  ];

  const handleLogout = () => {
    logout();
    notifySuccess("Signed out.");
    router.replace("/login");
  };

  const linkClass = (active: boolean) =>
    active
      ? "rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white"
      : "rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-[var(--color-canvas-alt)]";

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-[var(--color-hairline)] bg-white/80 px-4 py-3 shadow-xl backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-base font-black text-white">
              K
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              KINETIC
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={linkClass(isActive(link.href))}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              {loading ? null : isAuthenticated ? (
                <>
                  <span className="max-w-[10rem] truncate text-sm font-semibold text-slate-700">
                    Hi, {name}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full border border-[var(--color-hairline)] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-[var(--color-canvas-alt)]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    aria-current={isActive("/register") ? "page" : undefined}
                    className={linkClass(isActive("/register"))}
                  >
                    Register
                  </Link>
                  <Link
                    href="/login"
                    aria-current={isActive("/login") ? "page" : undefined}
                    className={linkClass(isActive("/login"))}
                  >
                    Login
                  </Link>
                </>
              )}
            </div>

            {canUseCart && (
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
            )}
          </div>
        </div>

        {/* Mobile nav row */}
        <nav className="mx-auto mt-2 flex max-w-6xl items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--color-hairline)] bg-white/80 px-2 py-2 shadow-md backdrop-blur-md sm:hidden">
          {navLinks.map((link) => {
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

          <span
            aria-hidden
            className="mx-1 h-5 w-px shrink-0 bg-[var(--color-hairline)]"
          />

          {loading ? null : isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-slate-600"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                href="/register"
                aria-current={isActive("/register") ? "page" : undefined}
                className={
                  isActive("/register")
                    ? "whitespace-nowrap rounded-full bg-[var(--color-brand)] px-3 py-1.5 text-sm font-semibold text-white"
                    : "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-slate-600"
                }
              >
                Register
              </Link>
              <Link
                href="/login"
                aria-current={isActive("/login") ? "page" : undefined}
                className={
                  isActive("/login")
                    ? "whitespace-nowrap rounded-full bg-[var(--color-brand)] px-3 py-1.5 text-sm font-semibold text-white"
                    : "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-slate-600"
                }
              >
                Login
              </Link>
            </>
          )}
        </nav>
      </header>

      {canUseCart && (
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      )}
    </>
  );
}
