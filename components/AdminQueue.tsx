"use client";

import { useState } from "react";
import type { Repo } from "@/lib/db/schema";
import { CATEGORY_META } from "./Badge";

const TYPES = ["skill", "mcp_server", "unclassified"] as const;

export function AdminQueue() {
  const [token, setToken] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/repos?includeHidden=1&perPage=200", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError("Unauthorized or request failed.");
      return;
    }
    const body = (await res.json()) as { repos: Repo[] };
    setRepos(body.repos);
    setLoaded(true);
  }

  async function patch(id: number, update: Partial<Pick<Repo, "type" | "category" | "hidden">>) {
    const res = await fetch(`/api/admin/repos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(update),
    });
    if (res.ok) {
      const { repo } = (await res.json()) as { repo: Repo };
      setRepos((prev) => prev.map((r) => (r.id === repo.id ? repo : r)));
    }
  }

  if (!loaded) {
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Admin token"
          className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={load}
          className="rounded-md bg-accent px-3 py-2 text-sm font-bold text-white hover:bg-accent-dark"
        >
          Load review queue
        </button>
        {error && <p className="text-sm text-accent">{error}</p>}
      </div>
    );
  }

  const unclassified = repos.filter((r) => r.type === "unclassified");
  const hidden = repos.filter((r) => r.hidden);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-lg font-black">Unclassified ({unclassified.length})</h2>
        <div className="flex flex-col gap-2">
          {unclassified.map((repo) => (
            <div key={repo.id} className="flex flex-wrap items-center gap-2 rounded-md border border-black/10 p-3 text-sm dark:border-white/10">
              <span className="font-bold">{repo.fullName}</span>
              <select
                defaultValue={repo.type}
                onChange={(e) => patch(repo.id, { type: e.target.value as Repo["type"] })}
                className="rounded border border-black/10 px-1.5 py-0.5 dark:border-white/10 dark:bg-neutral-900"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                defaultValue={repo.category}
                onChange={(e) => patch(repo.id, { category: e.target.value })}
                className="rounded border border-black/10 px-1.5 py-0.5 dark:border-white/10 dark:bg-neutral-900"
              >
                {Object.keys(CATEGORY_META).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => patch(repo.id, { hidden: true })}
                className="ml-auto rounded border border-black/10 px-2 py-0.5 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                Hide
              </button>
            </div>
          ))}
          {unclassified.length === 0 && <p className="text-sm text-gray-500">Nothing to review.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-black">Hidden ({hidden.length})</h2>
        <div className="flex flex-col gap-2">
          {hidden.map((repo) => (
            <div key={repo.id} className="flex items-center gap-2 rounded-md border border-black/10 p-3 text-sm dark:border-white/10">
              <span className="font-bold">{repo.fullName}</span>
              <button
                type="button"
                onClick={() => patch(repo.id, { hidden: false })}
                className="ml-auto rounded border border-black/10 px-2 py-0.5 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                Unhide
              </button>
            </div>
          ))}
          {hidden.length === 0 && <p className="text-sm text-gray-500">No hidden repos.</p>}
        </div>
      </section>
    </div>
  );
}
