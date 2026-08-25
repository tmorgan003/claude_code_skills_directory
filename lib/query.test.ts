import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { db, sqlite } from "./db/client";
import { repos, type NewRepo } from "./db/schema";
import { queryRepos } from "./query";

function seedRepo(overrides: Partial<NewRepo>): NewRepo {
  return {
    githubId: Math.floor(Math.random() * 1_000_000),
    fullName: "owner/repo",
    owner: "owner",
    name: "repo",
    description: "a repo",
    purposeSummary: "a repo",
    type: "skill",
    category: "other",
    topics: [],
    stars: 0,
    githubUrl: "https://github.com/owner/repo",
    createdAt: "2026-01-01T00:00:00Z",
    fetchedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeAll(() => {
  migrate(db, { migrationsFolder: "./db/migrations" });
});

beforeEach(() => {
  sqlite.exec("DELETE FROM star_history; DELETE FROM repos; DELETE FROM refresh_runs;");
});

describe("queryRepos", () => {
  it("full-text searches across name/description/purpose/topics", () => {
    db.insert(repos)
      .values([
        seedRepo({ githubId: 1, fullName: "a/postgres-tool", name: "postgres-tool", description: "talks to postgres" }),
        seedRepo({ githubId: 2, fullName: "a/other", name: "other", description: "does something else" }),
      ])
      .run();

    const result = queryRepos({ q: "postgres" });
    expect(result.repos.map((r) => r.name)).toEqual(["postgres-tool"]);
  });

  it("reflects UPDATEs and DELETEs in search results (FTS5 trigger sync)", () => {
    const [inserted] = db.insert(repos).values(seedRepo({ githubId: 1, description: "about mysql" })).returning().all();

    expect(queryRepos({ q: "mysql" }).total).toBe(1);

    db.update(repos).set({ description: "about redis now" }).where(eq(repos.id, inserted!.id)).run();
    expect(queryRepos({ q: "mysql" }).total).toBe(0);
    expect(queryRepos({ q: "redis" }).total).toBe(1);

    db.delete(repos).where(eq(repos.id, inserted!.id)).run();
    expect(queryRepos({ q: "redis" }).total).toBe(0);
  });

  it("filters by type, category, language, and license", () => {
    db.insert(repos)
      .values([
        seedRepo({ githubId: 1, type: "skill", category: "data", primaryLanguage: "TypeScript", license: "MIT" }),
        seedRepo({ githubId: 2, type: "mcp_server", category: "web", primaryLanguage: "Python", license: "Apache-2.0" }),
      ])
      .run();

    expect(queryRepos({ type: "skill" }).total).toBe(1);
    expect(queryRepos({ category: "web" }).total).toBe(1);
    expect(queryRepos({ language: "Python" }).total).toBe(1);
    expect(queryRepos({ license: "MIT" }).total).toBe(1);
  });

  it("excludes hidden and removed repos by default", () => {
    db.insert(repos)
      .values([
        seedRepo({ githubId: 1, hidden: true }),
        seedRepo({ githubId: 2, removedAt: "2026-01-01T00:00:00Z" }),
        seedRepo({ githubId: 3 }),
      ])
      .run();

    expect(queryRepos({}).total).toBe(1);
    expect(queryRepos({ includeHidden: true }).total).toBe(3);
  });

  it("sorts by stars descending", () => {
    db.insert(repos)
      .values([
        seedRepo({ githubId: 1, name: "low", stars: 5 }),
        seedRepo({ githubId: 2, name: "high", stars: 500 }),
      ])
      .run();

    const result = queryRepos({ sort: "stars" });
    expect(result.repos.map((r) => r.name)).toEqual(["high", "low"]);
  });

  it("paginates correctly and reports the unpaginated total", () => {
    db.insert(repos)
      .values(Array.from({ length: 5 }, (_, i) => seedRepo({ githubId: i + 1, name: `r${i}` })))
      .run();

    const page1 = queryRepos({ page: 1, perPage: 2, sort: "stars" });
    expect(page1.repos).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page3 = queryRepos({ page: 3, perPage: 2, sort: "stars" });
    expect(page3.repos).toHaveLength(1);
  });
});
