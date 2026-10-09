import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import ProductImage from "../../components/ProductImage";
import ProductDetail from "./ProductDetail";

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) ? id : null;
}

export async function generateMetadata(
  props: PageProps<"/products/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const numericId = parseId(id);
  const product = numericId !== null ? await getProduct(numericId) : null;

  if (!product) {
    return { title: "Product not found" };
  }

  return {
    title: product.name,
    description: product.description || `Buy ${product.name} at RevoShop.`,
  };
}

export default async function ProductDetailPage(
  props: PageProps<"/products/[id]">
) {
  const { id } = await props.params;
  const numericId = parseId(id);
  const product = numericId !== null ? await getProduct(numericId) : null;

  if (!product) {
    notFound();
  }

  return (
    <article className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-[var(--color-brand)]">
          Home
        </Link>{" "}
        <span aria-hidden>/</span>{" "}
        <Link href="/products" className="hover:text-[var(--color-brand)]">
          Products
        </Link>{" "}
        <span aria-hidden>/</span>{" "}
        <span className="font-medium text-slate-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-[var(--color-hairline)]">
          <ProductImage
            product={product}
            className="aspect-square w-full"
            textClassName="text-7xl"
          />
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {product.name}
            </h1>
            {/* <p className="mt-1 text-sm text-slate-400">
              SKU · RS-{String(product.id).padStart(5, "0")}
            </p> */}
          </div>

          <p className="text-3xl font-bold text-[var(--color-brand)]">
            {formatPrice(product.price)}
          </p>

          {product.description && (
            <p className="leading-relaxed text-slate-600">
              {product.description}
            </p>
          )}

          <div className="border-t border-[var(--color-hairline)] pt-5">
            <ProductDetail product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}
