# Claude Code Skills Directory

Finds, classifies, and displays the most popular Claude Code skills and MCP servers on GitHub, refreshed automatically every 8 hours. Full-text search, filters, trending/"Up and Coming", bookmarks, and an admin review queue.

Community-sourced. Not an official Anthropic product.

## Tech stack

Next.js (App Router) + TypeScript strict, Tailwind CSS, SQLite (`better-sqlite3`) + Drizzle ORM, SQLite FTS5 for search, `lucide-react` icons, Vitest. Free/OSS only — no paid services required.

## Local development

```bash
npm install
cp .env.example .env   # fill in ADMIN_TOKEN (required) and GITHUB_TOKEN (optional)
npm run db:migrate
npm run dev
```

Directory runs empty until you run a refresh:

```bash
npm run refresh
```

Run tests with `npm run test`.

### Sample data for local testing

Pulling live data from GitHub on every local test run is slow and burns API rate limit. Once you have a real, populated database (after a successful `npm run refresh`), snapshot it once:

```bash
npm run db:snapshot-sample   # writes fixtures/skills.sample.db
```

From then on, any other clone/checkout can load that snapshot instead of hitting GitHub:

```bash
npm run db:load-sample       # copies the fixture into $DATABASE_PATH
```

`fixtures/skills.sample.db` is committed to the repo — re-run `db:snapshot-sample` after a real refresh whenever you want to refresh the sample data itself.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_TOKEN` | Yes | Shared secret gating `POST /api/refresh` and the admin review queue (`/admin`). Generate with `openssl rand -hex 32`. |
| `GITHUB_TOKEN` | No, but recommended | Raises the GitHub API rate limit from 60/hour to 5,000/hour. Generate a [fine-grained personal access token](https://github.com/settings/tokens?type=beta) with read-only access to public repositories — no other scopes needed. |
| `DATABASE_PATH` | No | Where the SQLite file lives. Defaults to `./data/skills.db`. |

## Self-hosting (Docker)

This app needs a **persistent, writable filesystem** for its SQLite database — it will not work correctly on standard serverless platforms (Vercel/Netlify functions) whose filesystem resets between invocations. Deploy it to a VPS, a container host with a persistent volume, or run it locally.

```bash
cp .env.example .env   # fill in ADMIN_TOKEN
docker compose up -d
```

The SQLite database persists in `./data` on the host via a bind-mounted volume.

## Keeping data fresh

The refresh pipeline (`scripts/refresh.ts`) is a standalone script, independent of the web process. Two ways to schedule it:

### Option A — GitHub Actions (recommended, free)

`.github/workflows/refresh.yml` runs every 8 hours (`cron: '0 */8 * * *'`) and POSTs to your deployed instance's `/api/refresh` route. In your GitHub repo settings, add these Actions secrets:

- `REFRESH_URL` — your deployed app's base URL (e.g. `https://skills.example.com`)
- `ADMIN_TOKEN` — same value as your app's `ADMIN_TOKEN` env var

You can also trigger it manually from the Actions tab (`workflow_dispatch`).

### Option B — cron-job.org (fallback, no GitHub Actions needed)

Create a free job at [cron-job.org](https://cron-job.org) that runs every 8 hours:

- URL: `https://<your-host>/api/refresh`
- Method: `POST`
- Header: `Authorization: Bearer <your ADMIN_TOKEN>`

Same endpoint either way — pick whichever trigger source is more convenient.

## Admin review queue

Visit `/admin` and enter your `ADMIN_TOKEN` to reclassify repos GitHub sourcing couldn't confidently type (`unclassified`) and to hide low-quality or spam results from the public directory.

## How classification works

1. `SKILL.md` at the repo root or in a subfolder → **Skill**
2. A repo name/topic that looks MCP-shaped (`mcp`, `mcp-server`) *and* a manifest file (`mcp.json`/`server.json`) → **MCP Server**
3. Explicit topic tags (`claude-skill`, `mcp-server`, etc.) → matching type
4. Otherwise → **Unclassified**, surfaced in the admin queue rather than guessed

Detecting a `SKILL.md` in a subfolder (rather than the repo root) requires `GITHUB_TOKEN` — the GitHub code search API used for that check returns 401 without authentication.
