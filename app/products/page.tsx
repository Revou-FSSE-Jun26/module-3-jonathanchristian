import { Suspense } from "react";
import { getCategories, getProducts } from "@/lib/api";
import ProductsBrowser from "./ProductsBrowser";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    // ProductsBrowser reads useSearchParams(); it must sit under a Suspense
    // boundary so the search params resolve before it commits. Without this,
    // the initial client render can see empty params and an incoming
    // ?category=<id> would not seed the filter.
    <Suspense fallback={null}>
      <ProductsBrowser initialProducts={products} categories={categories} />
    </Suspense>
  );
}
