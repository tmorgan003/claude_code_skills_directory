import Link from "next/link";
import { GitFork, Star } from "lucide-react";
import type { Repo } from "@/lib/db/schema";
import { CategoryBadge, NewBadge, TrendingBadge, TypeBadge, isNewOnGithub } from "./Badge";
import { BookmarkButton } from "./BookmarkButton";

export function RepoRow({ repo }: { repo: Repo }) {
  return (
    <Link
      href={`/repo/${repo.owner}/${repo.name}`}
      className="group flex items-center gap-4 rounded-lg border border-black/10 bg-white px-4 py-3 transition hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent dark:border-white/10 dark:bg-neutral-900 dark:hover:bg-white/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-bold text-slate-900 group-hover:text-accent dark:text-white">
            {repo.owner}/{repo.name}
          </span>
          {isNewOnGithub(repo.createdAt) && <NewBadge />}
        </div>
        <p className="truncate text-sm text-gray-600 dark:text-gray-300">{repo.purposeSummary}</p>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        <TypeBadge type={repo.type} />
        <CategoryBadge category={repo.category} />
        <TrendingBadge growth={repo.trending7d} />
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Star size={13} /> {repo.stars.toLocaleString()}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <GitFork size={13} /> {repo.forks.toLocaleString()}
        </span>
      </div>

      <BookmarkButton githubId={repo.githubId} />
    </Link>
  );
}
