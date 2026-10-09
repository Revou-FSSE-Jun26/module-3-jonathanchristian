export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-20 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white" />
      <div className="h-24 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white"
          />
        ))}
      </div>
    </div>
  );
}
