import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your RevoShop account.",
};

export default function LoginPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--color-brand)]">
            Home
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <span className="font-medium text-slate-700">Login</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to continue shopping on RevoShop.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
        <LoginForm />
      </div>
    </section>
  );
}
