import { getCategories, getCategory, getProducts } from "@/lib/api";
import ProductsBrowser from "./ProductsBrowser";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  const categoryDetails = await Promise.allSettled(
    categories.map((category) => getCategory(category.id))
  );

  const categoryProductIds: Record<number, number[]> = {};
  categoryDetails.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      categoryProductIds[categories[index].id] = result.value.products.map(
        (p) => p.id
      );
    } else {
      categoryProductIds[categories[index].id] = [];
    }
  });

  return (
    <ProductsBrowser
      initialProducts={products}
      categories={categories}
      categoryProductIds={categoryProductIds}
    />
  );
}
