import type { Metadata } from "next";
import Link from "next/link";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = {
  title: "Profile",
  description: "View and update your KINETIC account details.",
};

export default function ProfilePage() {
  return (
    // Any authenticated user (customer or admin) may manage their own profile.
    <ProtectedRoute>
      <section className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header>
          <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500">
            <Link href="/" className="hover:text-[var(--color-brand)]">
              Home
            </Link>{" "}
            <span aria-hidden>/</span>{" "}
            <span className="font-medium text-slate-700">Profile</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Your profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your account details and update your information.
          </p>
        </header>

        <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
          <ProfileForm />
        </div>
      </section>
    </ProtectedRoute>
  );
}
