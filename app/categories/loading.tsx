export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-16 w-64 animate-pulse rounded-2xl bg-white" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl border border-[var(--color-hairline)] bg-white"
          />
        ))}
      </div>
    </div>
  );
}
