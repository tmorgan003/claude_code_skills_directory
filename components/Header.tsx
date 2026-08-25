"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock, Github, Moon, RefreshCw, Sun } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";

export function Header({ lastUpdated }: { lastUpdated: string | null }) {
  const router = useRouter();
  const { isDark, toggle } = useDarkMode();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function refreshNow() {
    const token = window.prompt("Admin token:");
    if (!token) return;
    setRefreshing(true);
    setStatus(null);
    try {
      const res = await fetch("/api/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setStatus("Unauthorized");
      } else {
        const body = await res.json();
        setStatus(`Run ${body.status}: +${body.reposAdded} added, ${body.reposUpdated} updated`);
        router.refresh();
      }
    } catch {
      setStatus("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <header className="border-b-4 border-accent bg-white dark:bg-neutral-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Claude Code <span className="text-accent">Skills</span> Directory
          </span>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          {lastUpdated && (
            <span className="hidden items-center gap-1 text-gray-500 sm:flex">
              <Clock size={14} />
              Last updated {new Date(lastUpdated).toLocaleString()}
            </span>
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-md border border-black/10 px-2.5 py-1.5 font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh now
          </button>

          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="rounded-md border border-black/10 p-1.5 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-black/10 p-1.5 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            aria-label="GitHub"
          >
            <Github size={16} />
          </a>
        </div>
      </div>
      {status && <p className="mx-auto max-w-7xl px-4 pb-2 text-xs text-gray-500">{status}</p>}
    </header>
  );
}
