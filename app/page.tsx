import { Suspense } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/api";
import ProductGrid from "./components/ProductGrid";
import HeroCarousel from "./components/HeroCarousel";

export const metadata = {
  title: "KINETIC — Modern Tech Store",
  description:
    "Discover audio gear, computing accessories, wearables, and smart lifestyle gadgets at KINETIC.",
};

const VALUE_PILLARS = [
  { icon: "🚚", title: "Free Express Shipping", body: "On every order, no minimum." },
  { icon: "↩️", title: "30-Day Trial", body: "Not for you? Send it back, free." },
  { icon: "🛟", title: "24/7 Tech Support", body: "Real humans, any time of day." },
];

async function FeaturedProducts() {
  const products = await getProducts();
  const featured = products.toSorted((a, b) => a.id - b.id).slice(0, 4);

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
      {/* Hero promo carousel */}
      <HeroCarousel />

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
              Featured Products
            </h2>
            <p className="text-sm text-slate-500">
              Hand-picked from the KINETIC catalogue.
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
