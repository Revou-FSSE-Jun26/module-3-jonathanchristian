import { Suspense } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/api";
import ProductGrid from "./components/ProductGrid";

export const metadata = {
  title: "RevoShop — Modern Tech Store",
  description:
    "Discover audio gear, computing accessories, wearables, and smart lifestyle gadgets at RevoShop.",
};

const VALUE_PILLARS = [
  { icon: "🚚", title: "Free Express Shipping", body: "On every order, no minimum." },
  { icon: "↩️", title: "30-Day Trial", body: "Not for you? Send it back, free." },
  { icon: "🛟", title: "24/7 Tech Support", body: "Real humans, any time of day." },
];

async function FeaturedProducts() {
  const products = await getProducts();
  const featured = products.slice(0, 5);

  return (
    <ProductGrid
      products={featured}
      featuredCount={featured.length}
      emptyMessage="No featured products available right now."
    />
  );
}

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-80 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white"
        />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-12">
      {/* Hero banner */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-brand)] to-indigo-700 px-6 py-14 text-white sm:px-12 sm:py-20">
        <span className="inline-block rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-bold text-slate-900">
          New drop · Tech season 2026
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Precision gear for the way you work, play, and move.
        </h1>
        <p className="mt-4 max-w-xl text-base text-blue-100 sm:text-lg">
          RevoShop brings together audio, computing, wearables, and smart
          living — with lightning-fast discovery and crystal-clear stock info.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--color-brand)] transition-transform hover:scale-[1.02]"
          >
            Shop all products
          </Link>
          <Link
            href="/categories"
            className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Browse categories
          </Link>
        </div>
      </section>

      {/* Value pillars */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {VALUE_PILLARS.map((pillar) => (
          <div
            key={pillar.title}
            className="flex items-start gap-3 rounded-2xl border border-[var(--color-hairline)] bg-white p-5"
          >
            <span className="text-2xl" aria-hidden>
              {pillar.icon}
            </span>
            <div>
              <h3 className="font-semibold text-slate-900">{pillar.title}</h3>
              <p className="text-sm text-slate-500">{pillar.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Featured gear */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Featured gear
            </h2>
            <p className="text-sm text-slate-500">
              Hand-picked from the RevoShop catalogue.
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-[var(--color-brand)] hover:underline"
          >
            View all →
          </Link>
        </div>
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedProducts />
        </Suspense>
      </section>
    </div>
  );
}
