import { sql } from "drizzle-orm";
import type { db as dbType } from "./client";

/** Strips FTS5 special characters and adds prefix matching per token, joined as implicit AND. */
export function sanitizeFtsQuery(raw: string): string {
  return raw
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .map((token) => `${token}*`)
    .join(" ");
}

/** Returns matching repo ids in FTS5 relevance (bm25) order. */
export function ftsMatchIds(db: typeof dbType, query: string): number[] {
  const sanitized = sanitizeFtsQuery(query);
  if (!sanitized) return [];
  const rows = db.all<{ id: number }>(
    sql`SELECT rowid as id FROM repos_fts WHERE repos_fts MATCH ${sanitized} ORDER BY rank`
  );
  return rows.map((r) => r.id);
}
