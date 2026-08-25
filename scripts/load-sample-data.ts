import fs from "node:fs";
import path from "node:path";

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/skills.db";
const FIXTURE_PATH = "fixtures/skills.sample.db";

if (!fs.existsSync(FIXTURE_PATH)) {
  console.error(`No fixture found at ${FIXTURE_PATH}. Run "npm run db:snapshot-sample" after a real refresh first.`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) {
  const stale = `${DATABASE_PATH}${suffix}`;
  if (fs.existsSync(stale)) fs.rmSync(stale);
}
fs.copyFileSync(FIXTURE_PATH, DATABASE_PATH);

console.log(`Loaded sample data into ${DATABASE_PATH}`);
