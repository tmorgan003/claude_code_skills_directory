"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toCsv } from "@/lib/csv";
import type { Repo } from "@/lib/db/schema";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ queryString }: { queryString: string }) {
  const [loading, setLoading] = useState(false);

  async function exportAs(format: "json" | "csv") {
    setLoading(true);
    try {
      const params = new URLSearchParams(queryString);
      params.set("perPage", "1000");
      const res = await fetch(`/api/repos?${params.toString()}`);
      const body = (await res.json()) as { repos: Repo[] };

      if (format === "json") {
        download("skills-directory.json", JSON.stringify(body.repos, null, 2), "application/json");
      } else {
        const rows = body.repos.map((r) => ({
          full_name: r.fullName,
          type: r.type,
          category: r.category,
          stars: r.stars,
          forks: r.forks,
          language: r.primaryLanguage ?? "",
          license: r.license ?? "",
          github_url: r.githubUrl,
        }));
        download("skills-directory.csv", toCsv(rows), "text/csv");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        type="button"
        disabled={loading}
        onClick={() => exportAs("json")}
        className="inline-flex items-center gap-1 rounded-md border border-black/10 px-2 py-1 font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
      >
        <Download size={13} /> JSON
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => exportAs("csv")}
        className="inline-flex items-center gap-1 rounded-md border border-black/10 px-2 py-1 font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
      >
        <Download size={13} /> CSV
      </button>
    </div>
  );
}
