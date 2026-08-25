import type { GithubRepoDetail } from "./types";

const API_BASE = "https://api.github.com";
const RETRY_DELAYS_MS = [500, 2000, 8000];
export const MAX_PAGES_PER_QUERY = 3;

export class RateLimitError extends Error {
  resetAt: Date;
  constructor(resetAt: Date) {
    super(`GitHub rate limit exhausted, resets at ${resetAt.toISOString()}`);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]!);
        continue;
      }
      throw err;
    }

    if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
      const resetHeader = res.headers.get("x-ratelimit-reset");
      const resetAt = resetHeader ? new Date(Number(resetHeader) * 1000) : new Date(Date.now() + 60_000);
      throw new RateLimitError(resetAt);
    }

    if (res.status >= 500 && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]!);
      continue;
    }

    return res;
  }

  throw lastError ?? new Error(`GitHub request failed: ${path}`);
}

interface SearchResponse {
  items: GithubRepoDetail[];
}

async function searchRepositories(query: string, page: number): Promise<GithubRepoDetail[]> {
  const res = await githubFetch(
    `/search/repositories?q=${encodeURIComponent(query)}&per_page=30&page=${page}`
  );
  if (!res.ok) return [];
  const body = (await res.json()) as SearchResponse;
  return body.items ?? [];
}

const TOPICS = [
  "claude-code",
  "claude-code-skill",
  "mcp-server",
  "model-context-protocol",
  "claude-skill",
];

const KEYWORDS = ['"MCP server"', '"Claude Code skill"', '"Model Context Protocol"'];

export async function searchRepositoriesByTopic(topic: string): Promise<GithubRepoDetail[]> {
  const results: GithubRepoDetail[] = [];
  for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
    const batch = await searchRepositories(`topic:${topic}`, page);
    results.push(...batch);
    if (batch.length < 30) break;
  }
  return results;
}

export async function searchRepositoriesByKeyword(keyword: string): Promise<GithubRepoDetail[]> {
  const results: GithubRepoDetail[] = [];
  for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
    const batch = await searchRepositories(`${keyword} in:description`, page);
    results.push(...batch);
    if (batch.length < 30) break;
  }
  return results;
}

export interface GatherResult {
  repos: GithubRepoDetail[];
  /** True if a rate limit cut the search short — repos still holds whatever was found before that. */
  rateLimited: boolean;
}

/**
 * Searches one topic/keyword at a time so a rate limit mid-way through still returns everything
 * found so far, rather than discarding it along with the exception.
 */
export async function gatherAllSearchCandidates(): Promise<GatherResult> {
  const repos: GithubRepoDetail[] = [];

  for (const topic of TOPICS) {
    try {
      repos.push(...(await searchRepositoriesByTopic(topic)));
    } catch (err) {
      if (err instanceof RateLimitError) return { repos, rateLimited: true };
      throw err;
    }
  }
  for (const keyword of KEYWORDS) {
    try {
      repos.push(...(await searchRepositoriesByKeyword(keyword)));
    } catch (err) {
      if (err instanceof RateLimitError) return { repos, rateLimited: true };
      throw err;
    }
  }

  return { repos, rateLimited: false };
}

export const SEED_REPOS = ["modelcontextprotocol/servers", "anthropics/skills"];
const AWESOME_LIST_REPOS = ["punkpeye/awesome-mcp-servers", "wong2/awesome-mcp-servers"];
const GITHUB_LINK_RE = /github\.com\/([\w.-]+)\/([\w.-]+?)(?=[)\s"'>#]|$)/g;

// ponytail: an awesome-list README can link hundreds of repos, and each one costs a full
// fetchRepoDetails call to resolve — cap it so this cross-check source can't eat the whole
// rate-limit budget at the expense of the (already rich, no-extra-call-needed) search results.
const MAX_AWESOME_LIST_LINKS = 40;

/** Regex-scans awesome-list READMEs for github.com/owner/repo links to widen the candidate pool. */
export async function parseAwesomeListReadmes(): Promise<string[]> {
  const found = new Set<string>();
  for (const fullName of AWESOME_LIST_REPOS) {
    const readme = await fetchReadme(fullName);
    if (!readme) continue;
    for (const match of readme.matchAll(GITHUB_LINK_RE)) {
      if (found.size >= MAX_AWESOME_LIST_LINKS) return [...found];
      const owner = match[1];
      const repo = match[2]?.replace(/\.git$/, "");
      if (owner && repo && !["blob", "tree", "issues", "pulls"].includes(repo)) {
        found.add(`${owner}/${repo}`);
      }
    }
  }
  return [...found];
}

export function fetchSeedListFullNames(): string[] {
  return [...SEED_REPOS, ...AWESOME_LIST_REPOS];
}

export async function fetchRepoDetails(fullName: string): Promise<GithubRepoDetail | null> {
  const res = await githubFetch(`/repos/${fullName}`);
  if (!res.ok) return null;
  return (await res.json()) as GithubRepoDetail;
}

export async function fetchReadme(fullName: string): Promise<string | null> {
  const res = await githubFetch(`/repos/${fullName}/readme`);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const body = (await res.json()) as { content: string; encoding: string };
  if (body.encoding !== "base64") return null;
  return Buffer.from(body.content, "base64").toString("utf-8");
}

export async function fetchRootContents(fullName: string): Promise<string[]> {
  const res = await githubFetch(`/repos/${fullName}/contents/`);
  if (!res.ok) return [];
  const body = (await res.json()) as { name: string; type: string }[];
  if (!Array.isArray(body)) return [];
  return body.filter((f) => f.type === "file").map((f) => f.name);
}

/**
 * Code search 401s unauthenticated, so this is only meaningful with GITHUB_TOKEN set.
 * GitHub's code_search bucket is far stricter than core even when authenticated (10/min) — this is
 * a bonus classification signal, never allowed to fail the candidate it's checking. A rate limit
 * here degrades to "unknown" (false) rather than rejecting, so core data (stars, readme, etc.) —
 * fetched in parallel via the same Promise.all in processCandidate — still gets saved.
 */
export async function fetchCodeSearchHasSkillMd(fullName: string): Promise<boolean> {
  if (!process.env.GITHUB_TOKEN) return false;
  try {
    const res = await githubFetch(`/search/code?q=filename:SKILL.md+repo:${fullName}`);
    if (!res.ok) return false;
    const body = (await res.json()) as { total_count: number };
    return (body.total_count ?? 0) > 0;
  } catch (err) {
    if (err instanceof RateLimitError) return false;
    throw err;
  }
}

/** Returns the repo detail if it still exists, or false on 404/410. Throws on inconclusive errors. */
export async function checkRepoExists(fullName: string): Promise<GithubRepoDetail | false> {
  const res = await githubFetch(`/repos/${fullName}`);
  if (res.status === 404 || res.status === 410) return false;
  if (!res.ok) throw new Error(`Inconclusive existence check for ${fullName}: HTTP ${res.status}`);
  return (await res.json()) as GithubRepoDetail;
}
