import { TrendingUp } from "lucide-react";
import type { Repo } from "@/lib/db/schema";
import { RepoCard } from "./RepoCard";

export function UpAndComing({ repos, recentRunIds }: { repos: Repo[]; recentRunIds: Set<number> }) {
  const trending = repos.filter((r) => r.trending7d > 0);
  if (trending.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="text-accent" size={20} />
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Up and Coming</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {trending.map((repo) => (
          <div key={repo.id} className="w-72 shrink-0">
            <RepoCard
              repo={repo}
              isNew={repo.firstSeenRunId !== null && recentRunIds.has(repo.firstSeenRunId)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
