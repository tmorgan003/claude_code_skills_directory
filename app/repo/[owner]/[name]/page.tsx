export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, GitFork, Github, Star, Tag } from "lucide-react";
import { CategoryBadge, TypeBadge } from "@/components/Badge";
import { CopyButton } from "@/components/CopyButton";
import { getRepoByOwnerName } from "@/lib/query";
import { renderReadme } from "@/lib/sanitize";

function repoAge(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (days < 30) return `${days}d old`;
  if (days < 365) return `${Math.floor(days / 30)}mo old`;
  return `${(days / 365).toFixed(1)}y old`;
}

export default function RepoDetailPage({ params }: { params: { owner: string; name: string } }) {
  const repo = getRepoByOwnerName(params.owner, params.name);
  if (!repo) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm text-gray-500 hover:text-accent">
        ← Back to directory
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{repo.owner}</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{repo.name}</h1>
        </div>
        <div className="flex gap-2">
          <TypeBadge type={repo.type} />
          <CategoryBadge category={repo.category} />
        </div>
      </div>

      <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">{repo.purposeSummary}</p>

      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-lg border border-black/10 bg-white p-4 text-sm dark:border-white/10 dark:bg-neutral-900">
        <span className="flex items-center gap-1">
          <Star size={15} /> {repo.stars.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <GitFork size={15} /> {repo.forks.toLocaleString()}
        </span>
        {repo.primaryLanguage && <span>{repo.primaryLanguage}</span>}
        {repo.license && <span>{repo.license}</span>}
        <span>{repoAge(repo.createdAt)}</span>
        {repo.lastCommitAt && <span>Last commit {new Date(repo.lastCommitAt).toLocaleDateString()}</span>}
      </div>

      {repo.topics.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Tag size={14} className="text-gray-400" />
          {repo.topics.map((t) => (
            <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={repo.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
        >
          <Github size={15} /> View on GitHub <ExternalLink size={13} />
        </a>
        {repo.packageUrl && (
          <a
            href={repo.packageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-black/10 px-3 py-2 text-sm font-bold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            {repo.packageManager === "npm" ? "npm" : "PyPI"} package <ExternalLink size={13} />
          </a>
        )}
      </div>

      {repo.installSnippet && (
        <div className="mt-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Install</h2>
            <CopyButton text={repo.installSnippet} />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
            <code>{repo.installSnippet}</code>
          </pre>
        </div>
      )}

      {repo.readmeExcerpt && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Readme</h2>
          <div
            className="readme-content rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
            dangerouslySetInnerHTML={{ __html: renderReadme(repo.readmeExcerpt) }}
          />
        </div>
      )}
    </div>
  );
}
