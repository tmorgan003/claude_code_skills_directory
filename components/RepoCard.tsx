import Link from "next/link";
import { ExternalLink, GitFork, Star } from "lucide-react";
import type { Repo } from "@/lib/db/schema";
import { CategoryBadge, NewBadge, TrendingBadge, TypeBadge, isNewOnGithub } from "./Badge";
import { BookmarkButton } from "./BookmarkButton";

export function RepoCard({ repo }: { repo: Repo }) {
  return (
    <Link
      href={`/repo/${repo.owner}/${repo.name}`}
      className="group flex flex-col rounded-lg border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent dark:border-white/10 dark:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-500">{repo.owner}</p>
          <h3 className="truncate text-lg font-extrabold text-slate-900 group-hover:text-accent dark:text-white">
            {repo.name}
          </h3>
        </div>
        <BookmarkButton githubId={repo.githubId} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <TypeBadge type={repo.type} />
        <CategoryBadge category={repo.category} />
        {isNewOnGithub(repo.createdAt) && <NewBadge />}
        <TrendingBadge growth={repo.trending7d} />
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-gray-600 dark:text-gray-300">
        {repo.purposeSummary ?? "No description available."}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Star size={13} /> {repo.stars.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <GitFork size={13} /> {repo.forks.toLocaleString()}
          </span>
          {repo.primaryLanguage && <span>{repo.primaryLanguage}</span>}
        </div>
        <ExternalLink size={13} />
      </div>
    </Link>
  );
}
