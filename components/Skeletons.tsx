export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          <div className="h-3 w-1/3 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-5 w-2/3 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-3 h-3 w-full rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-3 w-3/4 rounded bg-black/10 dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
}
