"use client";

import { useEffect } from "react";

export default function CategoriesError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-hairline)] bg-white px-6 py-16 text-center">
      <span className="text-4xl" aria-hidden>
        ⚠️
      </span>
      <h2 className="mt-3 text-lg font-bold text-slate-900">
        We couldn&apos;t load the categories
      </h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        The RevoShop API may be unavailable. Make sure the API server is
        running.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-5 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
      >
        Try again
      </button>
    </div>
  );
}
