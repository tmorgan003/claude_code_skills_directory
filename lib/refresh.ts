import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import { repos, refreshRuns, starHistory } from "./db/schema";
import { classifyCategory, classifyType } from "./classify";
import { extractInstallSnippet, extractPackageUrl, extractPurposeSummary } from "./extract";
import * as githubDefault from "./github";
import { RateLimitError } from "./github";
import type { GithubRepoDetail, RunRefreshResult } from "./types";

export type GithubClient = typeof githubDefault;

const BATCH_SIZE = 5;
const README_EXCERPT_MAX = 4000;
const REMOVAL_CONFIRM_MISSES = 2;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface RunState {
  runId: number;
  added: number;
  updated: number;
  removed: number;
  errors: string[];
  /** Final run status should be "partial" — set whenever any phase couldn't fully complete. */
  partial: boolean;
  /** We're rate-limited right now — stop starting new batches immediately. Distinct from `partial`:
   *  a rate limit hit while gathering candidates still leaves earlier-gathered candidates worth processing. */
  stopNow: boolean;
  processedFullNames: Set<string>;
}

function upsertRepo(state: RunState, detail: GithubRepoDetail, readme: string | null, rootFiles: string[], subfolderHasSkillMd: boolean) {
  const now = new Date().toISOString();
  const topics = detail.topics ?? [];
  const type = classifyType({ fullName: detail.full_name, topics, rootFiles, subfolderHasSkillMd });
  const category = classifyCategory([detail.name, detail.description, ...topics].join(" "));
  const purposeSummary = extractPurposeSummary(detail.description, readme);
  const installSnippet = extractInstallSnippet(readme);
  const pkg = extractPackageUrl(installSnippet ?? readme);
  // Stored as raw (bounded) markdown, not stripped — rendered + sanitized at read time via lib/sanitize.ts.
  const readmeExcerpt = readme ? readme.slice(0, README_EXCERPT_MAX) : null;

  const fields = {
    fullName: detail.full_name,
    owner: detail.owner.login,
    name: detail.name,
    description: detail.description,
    purposeSummary,
    readmeExcerpt,
    type,
    category,
    topics,
    stars: detail.stargazers_count,
    forks: detail.forks_count,
    openIssues: detail.open_issues_count,
    primaryLanguage: detail.language,
    license: detail.license?.spdx_id ?? null,
    githubUrl: detail.html_url,
    packageUrl: pkg?.url ?? null,
    packageManager: pkg?.manager ?? null,
    installSnippet,
    createdAt: detail.created_at,
    lastCommitAt: detail.pushed_at,
    fetchedAt: now,
  };

  const existing = db.select().from(repos).where(eq(repos.githubId, detail.id)).get();

  if (!existing) {
    const [inserted] = db
      .insert(repos)
      .values({ ...fields, githubId: detail.id, firstSeenRunId: state.runId, removedMissCount: 0, removedAt: null })
      .returning()
      .all();
    state.added++;
    state.processedFullNames.add(detail.full_name);
    recordStarHistory(state.runId, inserted!.id, detail.stargazers_count);
    return;
  }

  const changed =
    existing.stars !== fields.stars ||
    existing.forks !== fields.forks ||
    existing.openIssues !== fields.openIssues ||
    existing.description !== fields.description ||
    existing.purposeSummary !== fields.purposeSummary ||
    existing.type !== fields.type ||
    existing.category !== fields.category ||
    existing.lastCommitAt !== fields.lastCommitAt ||
    existing.license !== fields.license ||
    existing.installSnippet !== fields.installSnippet;

  db.update(repos)
    .set({ ...fields, removedMissCount: 0, removedAt: null })
    .where(eq(repos.id, existing.id))
    .run();

  if (changed) state.updated++;
  state.processedFullNames.add(detail.full_name);
  recordStarHistory(state.runId, existing.id, detail.stargazers_count);
}

function recordStarHistory(runId: number, repoId: number, stars: number) {
  db.insert(starHistory)
    .values({ repoId, runId, stars, recordedAt: new Date().toISOString() })
    .onConflictDoNothing()
    .run();
}

async function processCandidate(state: RunState, client: GithubClient, detail: GithubRepoDetail) {
  const [readme, rootFiles, subfolderHasSkillMd] = await Promise.all([
    client.fetchReadme(detail.full_name),
    client.fetchRootContents(detail.full_name),
    client.fetchCodeSearchHasSkillMd(detail.full_name),
  ]);
  upsertRepo(state, detail, readme, rootFiles, subfolderHasSkillMd);
}

async function runBatches<T>(items: T[], state: RunState, fn: (item: T) => Promise<void>): Promise<void> {
  for (const batch of chunk(items, BATCH_SIZE)) {
    if (state.stopNow) return;
    const results = await Promise.allSettled(batch.map(fn));
    for (const result of results) {
      if (result.status === "rejected") {
        if (result.reason instanceof RateLimitError) {
          state.stopNow = true;
          state.partial = true;
          return;
        }
        state.errors.push(String(result.reason?.message ?? result.reason));
      }
    }
  }
}

async function gatherCandidates(state: RunState, client: GithubClient): Promise<Map<string, GithubRepoDetail>> {
  const candidates = new Map<string, GithubRepoDetail>();

  try {
    const { repos: found, rateLimited } = await client.gatherAllSearchCandidates();
    for (const detail of found) candidates.set(detail.full_name, detail);
    if (rateLimited) state.partial = true;
  } catch (err) {
    state.errors.push(`search gathering: ${(err as Error).message}`);
  }

  let extraNames: string[] = [];
  try {
    extraNames = [...client.fetchSeedListFullNames(), ...(await client.parseAwesomeListReadmes())];
  } catch (err) {
    state.errors.push(`seed/awesome list gathering: ${(err as Error).message}`);
  }

  // Resolving seed/awesome-list names costs one extra API call each, unlike search results
  // (which already carry full detail). A rate limit hit here shouldn't block processing of the
  // richer search-derived candidates below — restore stopNow after this phase either way.
  const stopNowBeforeSeedExpansion = state.stopNow;
  await runBatches(
    extraNames.filter((name) => !candidates.has(name)),
    state,
    async (name) => {
      const detail = await client.fetchRepoDetails(name);
      if (detail) candidates.set(detail.full_name, detail);
    }
  );
  state.stopNow = stopNowBeforeSeedExpansion;

  return candidates;
}

async function removalPass(state: RunState, client: GithubClient) {
  const untouched = db
    .select()
    .from(repos)
    .where(
      and(
        isNull(repos.removedAt),
        state.processedFullNames.size > 0 ? notInArray(repos.fullName, [...state.processedFullNames]) : undefined
      )
    )
    .all();

  await runBatches(untouched, state, async (repo) => {
    const exists = await client.checkRepoExists(repo.fullName);
    if (exists) {
      db.update(repos)
        .set({
          stars: exists.stargazers_count,
          forks: exists.forks_count,
          openIssues: exists.open_issues_count,
          lastCommitAt: exists.pushed_at,
          removedMissCount: 0,
          fetchedAt: new Date().toISOString(),
        })
        .where(eq(repos.id, repo.id))
        .run();
      state.updated++;
    } else {
      const missCount = repo.removedMissCount + 1;
      if (missCount >= REMOVAL_CONFIRM_MISSES) {
        db.update(repos)
          .set({ removedAt: new Date().toISOString(), removedMissCount: missCount })
          .where(eq(repos.id, repo.id))
          .run();
        state.removed++;
      } else {
        db.update(repos).set({ removedMissCount: missCount }).where(eq(repos.id, repo.id)).run();
      }
    }
  });
}

function recomputeTrending(fullNames: Set<string>) {
  const now = Date.now();
  const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const fullName of fullNames) {
    const repo = db.select().from(repos).where(eq(repos.fullName, fullName)).get();
    if (!repo) continue;

    const past7 = db
      .select({ stars: starHistory.stars })
      .from(starHistory)
      .where(and(eq(starHistory.repoId, repo.id), sql`${starHistory.recordedAt} <= ${cutoff7d}`))
      .orderBy(sql`${starHistory.recordedAt} DESC`)
      .limit(1)
      .get();
    const past30 = db
      .select({ stars: starHistory.stars })
      .from(starHistory)
      .where(and(eq(starHistory.repoId, repo.id), sql`${starHistory.recordedAt} <= ${cutoff30d}`))
      .orderBy(sql`${starHistory.recordedAt} DESC`)
      .limit(1)
      .get();

    db.update(repos)
      .set({
        trending7d: past7 ? repo.stars - past7.stars : 0,
        trending30d: past30 ? repo.stars - past30.stars : 0,
      })
      .where(eq(repos.id, repo.id))
      .run();
  }
}

export async function runRefresh(client: GithubClient = githubDefault): Promise<RunRefreshResult> {
  const startedAt = new Date().toISOString();
  const [run] = db.insert(refreshRuns).values({ startedAt, status: "partial" }).returning().all();
  const runId = run!.id;

  const state: RunState = {
    runId,
    added: 0,
    updated: 0,
    removed: 0,
    errors: [],
    partial: false,
    stopNow: false,
    processedFullNames: new Set(),
  };

  try {
    const candidates = await gatherCandidates(state, client);
    await runBatches([...candidates.values()], state, (detail) => processCandidate(state, client, detail));
    if (!state.stopNow) {
      await removalPass(state, client);
    }
    recomputeTrending(state.processedFullNames);
  } catch (err) {
    state.errors.push(`unexpected: ${(err as Error).message}`);
  }

  const status =
    state.errors.length > 0 && state.added === 0 && state.updated === 0 && state.removed === 0
      ? "failed"
      : state.partial
        ? "partial"
        : "success";

  db.update(refreshRuns)
    .set({
      finishedAt: new Date().toISOString(),
      status,
      reposAdded: state.added,
      reposUpdated: state.updated,
      reposRemoved: state.removed,
      errorLog: state.errors,
    })
    .where(eq(refreshRuns.id, runId))
    .run();

  return { runId, status, reposAdded: state.added, reposUpdated: state.updated, reposRemoved: state.removed, errorLog: state.errors };
}
