"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { CATEGORY_META } from "./Badge";
import { ExportButton } from "./ExportButton";

const SORT_OPTIONS = [
  { value: "stars", label: "Most stars" },
  { value: "updated", label: "Recently updated" },
  { value: "added", label: "Recently added" },
  { value: "trending7d", label: "Trending (7d)" },
  { value: "trending30d", label: "Trending (30d)" },
];

export function FilterBar({ languages, licenses }: { languages: string[]; licenses: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) setParam("q", q);
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const view = searchParams.get("view") === "list" ? "list" : "grid";

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Search skills and MCP servers…"
            className="w-full rounded-md border border-black/10 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent dark:border-white/10"
          />
        </div>

        <div className="flex overflow-hidden rounded-md border border-black/10 dark:border-white/10">
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setParam("view", "grid")}
            className={`p-2 ${view === "grid" ? "bg-accent text-white" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setParam("view", "list")}
            className={`p-2 ${view === "list" ? "bg-accent text-white" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            <List size={16} />
          </button>
        </div>

        <ExportButton queryString={searchParams.toString()} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <SlidersHorizontal size={15} className="text-gray-400" />

        <select
          value={searchParams.get("type") ?? ""}
          onChange={(e) => setParam("type", e.target.value)}
          className="rounded-md border border-black/10 bg-transparent px-2 py-1 dark:border-white/10"
        >
          <option value="">All types</option>
          <option value="skill">Skill</option>
          <option value="mcp_server">MCP Server</option>
        </select>

        <select
          value={searchParams.get("category") ?? ""}
          onChange={(e) => setParam("category", e.target.value)}
          className="rounded-md border border-black/10 bg-transparent px-2 py-1 dark:border-white/10"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("language") ?? ""}
          onChange={(e) => setParam("language", e.target.value)}
          className="rounded-md border border-black/10 bg-transparent px-2 py-1 dark:border-white/10"
        >
          <option value="">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("license") ?? ""}
          onChange={(e) => setParam("license", e.target.value)}
          className="rounded-md border border-black/10 bg-transparent px-2 py-1 dark:border-white/10"
        >
          <option value="">All licenses</option>
          {licenses.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("sort") ?? "stars"}
          onChange={(e) => setParam("sort", e.target.value)}
          className="ml-auto rounded-md border border-black/10 bg-transparent px-2 py-1 dark:border-white/10"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
