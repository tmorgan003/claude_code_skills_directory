import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { db, sqlite } from "./db/client";
import { repos, starHistory } from "./db/schema";
import { runRefresh, type GithubClient } from "./refresh";
import * as githubDefault from "./github";
import { RateLimitError } from "./github";
import type { GithubRepoDetail } from "./types";

function makeRepo(overrides: Partial<GithubRepoDetail>): GithubRepoDetail {
  return {
    id: 1,
    full_name: "owner/repo",
    owner: { login: "owner" },
    name: "repo",
    description: "A claude skill for testing",
    stargazers_count: 10,
    forks_count: 1,
    open_issues_count: 0,
    language: "TypeScript",
    license: null,
    topics: ["claude-skill"],
    html_url: "https://github.com/owner/repo",
    created_at: "2026-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function fakeClient(candidates: GithubRepoDetail[], existsOverride?: (fullName: string) => Promise<GithubRepoDetail | false>): GithubClient {
  return {
    ...githubDefault,
    gatherAllSearchCandidates: async () => ({ repos: candidates, rateLimited: false }),
    fetchSeedListFullNames: () => [],
    parseAwesomeListReadmes: async () => [],
    fetchRepoDetails: async () => null,
    fetchReadme: async () => null,
    fetchRootContents: async () => [],
    fetchCodeSearchHasSkillMd: async () => false,
    checkRepoExists: existsOverride ?? (async () => false),
  };
}

const REPO_A = makeRepo({ id: 1, full_name: "owner/a", name: "a" });
const REPO_B = makeRepo({ id: 2, full_name: "owner/b", name: "b" });
const REPO_C = makeRepo({ id: 3, full_name: "owner/c", name: "c" });

beforeAll(() => {
  migrate(db, { migrationsFolder: "./db/migrations" });
});

beforeEach(() => {
  sqlite.exec("DELETE FROM star_history; DELETE FROM repos; DELETE FROM refresh_runs;");
});

describe("runRefresh idempotency", () => {
  it("adds new repos on the first run", async () => {
    const result = await runRefresh(fakeClient([REPO_A, REPO_B, REPO_C]));
    expect(result.status).toBe("success");
    expect(result.reposAdded).toBe(3);
    expect(result.reposUpdated).toBe(0);

    const rows = db.select().from(repos).all();
    expect(rows).toHaveLength(3);
  });

  it("adds and updates nothing on an identical second run", async () => {
    await runRefresh(fakeClient([REPO_A, REPO_B, REPO_C]));
    const result = await runRefresh(fakeClient([REPO_A, REPO_B, REPO_C]));

    expect(result.reposAdded).toBe(0);
    expect(result.reposUpdated).toBe(0);
    expect(db.select().from(repos).all()).toHaveLength(3);
  });
});

describe("runRefresh partial rate-limited gathering", () => {
  it("still processes and adds candidates found before the rate limit hit", async () => {
    const client: GithubClient = {
      ...githubDefault,
      gatherAllSearchCandidates: async () => ({ repos: [REPO_A, REPO_B], rateLimited: true }),
      fetchSeedListFullNames: () => [],
      parseAwesomeListReadmes: async () => [],
      fetchRepoDetails: async () => null,
      fetchReadme: async () => null,
      fetchRootContents: async () => [],
      fetchCodeSearchHasSkillMd: async () => false,
      checkRepoExists: async () => false,
    };

    const result = await runRefresh(client);

    expect(result.status).toBe("partial");
    expect(result.reposAdded).toBe(2);
    expect(db.select().from(repos).all()).toHaveLength(2);
  });

  it("still processes search candidates when the seed/awesome-list expansion phase (not search itself) hits the rate limit", async () => {
    const client: GithubClient = {
      ...githubDefault,
      gatherAllSearchCandidates: async () => ({ repos: [REPO_A, REPO_B], rateLimited: false }),
      fetchSeedListFullNames: () => ["someone/unrelated-repo"],
      parseAwesomeListReadmes: async () => [],
      fetchRepoDetails: async () => {
        throw new RateLimitError(new Date());
      },
      fetchReadme: async () => null,
      fetchRootContents: async () => [],
      fetchCodeSearchHasSkillMd: async () => false,
      checkRepoExists: async () => false,
    };

    const result = await runRefresh(client);

    // The seed-list lookup failed (rate limited), but the two search-derived candidates
    // (which needed no extra API call) must still have been processed and added.
    expect(result.reposAdded).toBe(2);
    expect(db.select().from(repos).all()).toHaveLength(2);
  });
});

describe("runRefresh trending computation", () => {
  it("uses the nearest snapshot at or before each window's cutoff independently", async () => {
    await runRefresh(fakeClient([REPO_A]));
    const repoA = db.select().from(repos).where(eq(repos.fullName, "owner/a")).get()!;

    // A snapshot 10 days old is old enough to be the baseline for the 1d and 7d windows, but not
    // old enough for the 30d window (which needs something >=30 days old) — so 30d should be 0
    // while 1d/7d both pick it up as their nearest available baseline.
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    sqlite.exec(`DELETE FROM star_history WHERE repo_id = ${repoA.id}`);
    db.insert(starHistory).values({ repoId: repoA.id, runId: repoA.firstSeenRunId!, stars: 5, recordedAt: tenDaysAgo }).run();

    const grown = makeRepo({ id: 1, full_name: "owner/a", name: "a", stargazers_count: 50 });
    await runRefresh(fakeClient([grown]));

    const updated = db.select().from(repos).where(eq(repos.fullName, "owner/a")).get()!;
    expect(updated.trending1d).toBe(45); // 50 - 5, the 10-day-old snapshot is the nearest baseline available
    expect(updated.trending7d).toBe(45);
    expect(updated.trending30d).toBe(0); // no snapshot >=30 days old exists yet
  });
});

describe("runRefresh removal pass star history", () => {
  it("records a star_history snapshot when a repo is confirmed to still exist", async () => {
    await runRefresh(fakeClient([REPO_A, REPO_B]));
    const repoB = db.select().from(repos).where(eq(repos.fullName, "owner/b")).get()!;
    const historyBefore = db.select().from(starHistory).where(eq(starHistory.repoId, repoB.id)).all();
    expect(historyBefore.length).toBeGreaterThan(0);

    // Run 2: repo B is missing from candidates but checkRepoExists confirms it's still there
    // with more stars — this goes through the removal pass's "still exists" branch.
    const grownB = makeRepo({ id: 2, full_name: "owner/b", name: "b", stargazers_count: 999 });
    await runRefresh(fakeClient([REPO_A], async (fullName) => (fullName === "owner/b" ? grownB : false)));

    const historyAfter = db.select().from(starHistory).where(eq(starHistory.repoId, repoB.id)).all();
    expect(historyAfter.length).toBe(historyBefore.length + 1);
    expect(historyAfter.some((h) => h.stars === 999)).toBe(true);
  });
});

describe("runRefresh removal anti-flap", () => {
  it("does not remove a repo after a single miss, only after two consecutive misses", async () => {
    await runRefresh(fakeClient([REPO_A, REPO_B, REPO_C]));

    // Run 2: repo C is missing from candidates and checkRepoExists says it's gone.
    const run2 = await runRefresh(fakeClient([REPO_A, REPO_B], async () => false));
    expect(run2.reposRemoved).toBe(0);
    let repoC = db.select().from(repos).where(eq(repos.fullName, "owner/c")).get();
    expect(repoC?.removedAt).toBeNull();
    expect(repoC?.removedMissCount).toBe(1);

    // Run 3: still missing, second consecutive miss -> removed.
    const run3 = await runRefresh(fakeClient([REPO_A, REPO_B], async () => false));
    expect(run3.reposRemoved).toBe(1);
    repoC = db.select().from(repos).where(eq(repos.fullName, "owner/c")).get();
    expect(repoC?.removedAt).not.toBeNull();
  });

  it("resets the miss counter when the repo is found again", async () => {
    await runRefresh(fakeClient([REPO_A, REPO_B, REPO_C]));
    await runRefresh(fakeClient([REPO_A, REPO_B], async () => false)); // 1 miss

    // Run 3: repo C reappears in candidates directly.
    await runRefresh(fakeClient([REPO_A, REPO_B, REPO_C]));
    const repoC = db.select().from(repos).where(eq(repos.fullName, "owner/c")).get();
    expect(repoC?.removedMissCount).toBe(0);
    expect(repoC?.removedAt).toBeNull();
  });
});
