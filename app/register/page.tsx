import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Register",
  description: "Create your KINETIC account.",
};

export default function RegisterPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--color-brand)]">
            Home
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <span className="font-medium text-slate-700">Register</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Join KINETIC to track orders and check out faster.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
        <RegisterForm />
      </div>
    </section>
  );
}
