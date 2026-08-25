import fs from "node:fs";
import path from "node:path";
import { sqlite } from "../lib/db/client";

const FIXTURE_PATH = "fixtures/skills.sample.db";

fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
if (fs.existsSync(FIXTURE_PATH)) fs.rmSync(FIXTURE_PATH);

// VACUUM INTO takes a consistent snapshot even while another process (e.g. the dev server)
// has the source database open, and produces a single compact file with no WAL sidecar.
sqlite.exec(`VACUUM INTO '${FIXTURE_PATH}'`);

console.log(`Snapshotted current database to ${FIXTURE_PATH}`);
sqlite.close();
