"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import ProtectedRoute from "../components/ProtectedRoute";

const DASHBOARD_LINKS = [
  { href: "/dashboard", label: "Products" },
  { href: "/dashboard/categories", label: "Categories" },
  { href: "/dashboard/orders", label: "Orders" },
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Exact match for Products (so it isn't active on sub-routes); prefix match
  // for the others.
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <ProtectedRoute requireRole="admin">
      <section className="flex flex-col gap-6">
        <header>
          <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
            <Link href="/" className="hover:text-[var(--color-brand)]">
              Home
            </Link>{" "}
            <span aria-hidden>/</span>{" "}
            <span className="font-medium text-slate-700">Dashboard</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Manage the catalogue and review all orders.
          </p>
        </header>

        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--color-hairline)] bg-white p-1.5">
          {DASHBOARD_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "whitespace-nowrap rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white"
                    : "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-[var(--color-canvas-alt)]"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </section>
    </ProtectedRoute>
  );
}
