import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your RevoShop order history.",
};

export default function OrdersPage() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--color-brand)]">
            Home
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <span className="font-medium text-slate-700">Orders</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Your Orders
        </h1>
      </header>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-hairline)] bg-white px-6 py-16 text-center">
        <span className="text-5xl" aria-hidden>
          🔒
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">
          Order history requires sign in
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          The orders endpoint needs an authenticated session, which isn&apos;t
          available in this checkpoint. Once sign in is implemented, your past
          orders will appear here.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-canvas-alt)] px-4 py-2 text-xs font-medium text-slate-500">
          <span aria-hidden>ℹ️</span>
          Checkpoint 2 limitation — authentication arrives in a later milestone.
        </div>

        <Link
          href="/products"
          className="mt-6 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
        >
          Continue shopping
        </Link>
      </div>
    </section>
  );
}
