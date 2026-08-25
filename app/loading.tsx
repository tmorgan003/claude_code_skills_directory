import { GridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 h-24 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
      <GridSkeleton />
    </div>
  );
}
