import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-hairline)] bg-white px-6 py-20 text-center">
      <span className="text-5xl" aria-hidden>
        🧭
      </span>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Product not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        We couldn&apos;t find the product you&apos;re looking for. It may have
        been removed or the link is incorrect.
      </p>
      <Link
        href="/products"
        className="mt-6 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
      >
        Back to all products
      </Link>
    </div>
  );
}
