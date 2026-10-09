import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse the full RevoShop catalogue. Search, filter by category, and add items to your cart.",
};

export default function ProductsLayout({ children }: LayoutProps<"/products">) {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
          <span>Home</span> <span aria-hidden>/</span>{" "}
          <span className="font-medium text-slate-700">Products</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          All Products
        </h1>
      </header>
      {children}
    </section>
  );
}
