import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const refreshRuns = sqliteTable("refresh_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status", { enum: ["success", "partial", "failed"] }).notNull(),
  reposAdded: integer("repos_added").notNull().default(0),
  reposUpdated: integer("repos_updated").notNull().default(0),
  reposRemoved: integer("repos_removed").notNull().default(0),
  errorLog: text("error_log", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
});

export const repos = sqliteTable("repos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  githubId: integer("github_id").notNull(),
  fullName: text("full_name").notNull(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  purposeSummary: text("purpose_summary"),
  readmeExcerpt: text("readme_excerpt"),
  type: text("type", { enum: ["skill", "mcp_server", "unclassified"] })
    .notNull()
    .default("unclassified"),
  category: text("category").notNull().default("other"),
  topics: text("topics", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  stars: integer("stars").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  openIssues: integer("open_issues").notNull().default(0),
  primaryLanguage: text("primary_language"),
  license: text("license"),
  githubUrl: text("github_url").notNull(),
  packageUrl: text("package_url"),
  packageManager: text("package_manager", { enum: ["npm", "pypi"] }),
  installSnippet: text("install_snippet"),
  createdAt: text("created_at").notNull(),
  lastCommitAt: text("last_commit_at"),
  fetchedAt: text("fetched_at").notNull(),
  firstSeenRunId: integer("first_seen_run_id").references(() => refreshRuns.id),
  trending1d: integer("trending_1d").notNull().default(0),
  trending7d: integer("trending_7d").notNull().default(0),
  trending30d: integer("trending_30d").notNull().default(0),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  removedAt: text("removed_at"),
  removedMissCount: integer("removed_miss_count").notNull().default(0),
}, (table) => ({
  githubIdIdx: uniqueIndex("repos_github_id_idx").on(table.githubId),
}));

export const starHistory = sqliteTable("star_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoId: integer("repo_id").notNull().references(() => repos.id),
  runId: integer("run_id").notNull().references(() => refreshRuns.id),
  stars: integer("stars").notNull(),
  recordedAt: text("recorded_at").notNull(),
}, (table) => ({
  repoRunIdx: uniqueIndex("star_history_repo_run_idx").on(table.repoId, table.runId),
}));

export type Repo = typeof repos.$inferSelect;
export type NewRepo = typeof repos.$inferInsert;
export type RefreshRun = typeof refreshRuns.$inferSelect;
export type NewRefreshRun = typeof refreshRuns.$inferInsert;
export type StarHistoryRow = typeof starHistory.$inferSelect;
