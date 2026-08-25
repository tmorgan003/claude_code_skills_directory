import type { Repo } from "@/lib/db/schema";
import { RepoCard } from "./RepoCard";
import { RepoRow } from "./RepoRow";

export function RepoCollection({
  repos,
  view,
  recentRunIds,
}: {
  repos: Repo[];
  view: "grid" | "list";
  recentRunIds: Set<number>;
}) {
  const isNew = (repo: Repo) => repo.firstSeenRunId !== null && recentRunIds.has(repo.firstSeenRunId);

  if (view === "list") {
    return (
      <div className="flex flex-col gap-2">
        {repos.map((repo) => (
          <RepoRow key={repo.id} repo={repo} isNew={isNew(repo)} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} isNew={isNew(repo)} />
      ))}
    </div>
  );
}
