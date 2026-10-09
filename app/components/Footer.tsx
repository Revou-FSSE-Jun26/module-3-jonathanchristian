import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--color-hairline)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-brand)] text-sm font-black text-white">
            R
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            RevoShop
          </span>
        </Link>
        <nav className="flex gap-6 text-sm text-slate-500">
          <Link href="/products" className="hover:text-[var(--color-brand)]">
            Products
          </Link>
          <Link href="/categories" className="hover:text-[var(--color-brand)]">
            Categories
          </Link>
          <Link href="/orders" className="hover:text-[var(--color-brand)]">
            Orders
          </Link>
        </nav>
        <p className="text-sm text-slate-400">&copy; RevoShop 2026</p>
      </div>
    </footer>
  );
}
