import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/api";
import Card from "../components/Card";

export const metadata: Metadata = {
  title: "Categories",
  description: "Explore RevoShop product categories.",
};

const CATEGORY_ICONS = ["🎧", "💻", "⌚", "📱", "🏠", "🎮", "📷", "🔌"];

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--color-brand)]">
            Home
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <span className="font-medium text-slate-700">Categories</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Shop by Category
        </h1>
        <p className="text-sm text-slate-500">
          Pick a category to see its products.
        </p>
      </header>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-hairline)] bg-white px-6 py-16 text-center text-slate-500">
          No categories available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/products?category=${category.id}`}
              className="group"
            >
              <Card interactive className="h-full p-6">
                <span className="text-3xl" aria-hidden>
                  {CATEGORY_ICONS[index % CATEGORY_ICONS.length]}
                </span>
                <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-[var(--color-brand)]">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="mt-1 text-sm text-slate-500">
                    {category.description}
                  </p>
                )}
                <span className="mt-4 inline-block text-sm font-semibold text-[var(--color-brand)]">
                  Browse products →
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
