import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/skills.db";

fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __sqlite: Database.Database | undefined;
}

const sqlite = globalThis.__sqlite ?? new Database(DATABASE_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
if (process.env.NODE_ENV !== "production") {
  globalThis.__sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
