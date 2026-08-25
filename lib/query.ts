import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./db/client";
import { refreshRuns, repos, type Repo } from "./db/schema";
import { ftsMatchIds } from "./db/fts";
import type { QueryParams } from "./types";

const DEFAULT_PER_PAGE = 24;

const SORTERS = {
  stars: desc(repos.stars),
  updated: desc(repos.lastCommitAt),
  added: desc(repos.firstSeenRunId),
  trending7d: desc(repos.trending7d),
  trending30d: desc(repos.trending30d),
} as const;

export interface QueryResult {
  repos: Repo[];
  total: number;
  page: number;
  perPage: number;
}

export function queryRepos(params: QueryParams): QueryResult {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? DEFAULT_PER_PAGE));

  const conditions = [];
  if (!params.includeHidden) {
    conditions.push(eq(repos.hidden, false));
    conditions.push(isNull(repos.removedAt));
  }
  if (params.type) conditions.push(eq(repos.type, params.type));
  if (params.category) conditions.push(eq(repos.category, params.category));
  if (params.language) conditions.push(eq(repos.primaryLanguage, params.language));
  if (params.license) conditions.push(eq(repos.license, params.license));

  let matchedIds: number[] | null = null;
  if (params.q?.trim()) {
    matchedIds = ftsMatchIds(db, params.q.trim());
    conditions.push(inArray(repos.id, matchedIds.length > 0 ? matchedIds : [-1]));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const total = (
    db.select({ count: sql<number>`count(*)` }).from(repos).where(where).all()
  )[0]?.count ?? 0;

  let rows = db
    .select()
    .from(repos)
    .where(where)
    .orderBy(params.sort ? SORTERS[params.sort] : desc(repos.stars))
    .limit(perPage)
    .offset((page - 1) * perPage)
    .all();

  if (matchedIds && !params.sort) {
    const rank = new Map(matchedIds.map((id, i) => [id, i]));
    rows = [...rows].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }

  return { repos: rows, total, page, perPage };
}

export function getLatestSuccessfulRun() {
  return db
    .select()
    .from(refreshRuns)
    .where(eq(refreshRuns.status, "success"))
    .orderBy(desc(refreshRuns.finishedAt))
    .limit(1)
    .get();
}

export function getRepoByOwnerName(owner: string, name: string) {
  return db
    .select()
    .from(repos)
    .where(and(eq(repos.owner, owner), eq(repos.name, name), isNull(repos.removedAt)))
    .get();
}

export function getFilterFacets(): { languages: string[]; licenses: string[] } {
  const langs = db
    .selectDistinct({ v: repos.primaryLanguage })
    .from(repos)
    .where(and(eq(repos.hidden, false), isNull(repos.removedAt), isNotNull(repos.primaryLanguage)))
    .all();
  const licenses = db
    .selectDistinct({ v: repos.license })
    .from(repos)
    .where(and(eq(repos.hidden, false), isNull(repos.removedAt), isNotNull(repos.license)))
    .all();
  return {
    languages: langs.map((l) => l.v!).sort(),
    licenses: licenses.map((l) => l.v!).sort(),
  };
}

/** Ids of the last 8 refresh runs — a repo is "new" if firstSeenRunId is one of these. */
export function getRecentRunIds(): Set<number> {
  const recentRuns = db
    .select({ id: refreshRuns.id })
    .from(refreshRuns)
    .orderBy(desc(refreshRuns.id))
    .limit(8)
    .all();
  return new Set(recentRuns.map((r) => r.id));
}
