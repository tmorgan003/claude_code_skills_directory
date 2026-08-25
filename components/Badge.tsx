import { Database, FileText, Globe, Shield, Terminal, Zap, Package, Wrench, Server, TrendingUp, Sparkles } from "lucide-react";

export const CATEGORY_META: Record<string, { label: string; icon: typeof Database; classes: string }> = {
  security: { label: "Security", icon: Shield, classes: "bg-category-security/10 text-category-security" },
  data: { label: "Data & Databases", icon: Database, classes: "bg-category-data/10 text-category-data" },
  web: { label: "Web & APIs", icon: Globe, classes: "bg-category-web/10 text-category-web" },
  docs: { label: "Docs & Writing", icon: FileText, classes: "bg-category-docs/10 text-category-docs" },
  devtools: { label: "Dev Tools", icon: Terminal, classes: "bg-category-devtools/10 text-category-devtools" },
  productivity: { label: "Productivity", icon: Zap, classes: "bg-category-productivity/10 text-category-productivity" },
  other: { label: "Other", icon: Package, classes: "bg-category-other/10 text-category-other" },
};

export function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.other!;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.classes}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: "skill" | "mcp_server" | "unclassified" }) {
  if (type === "skill") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
        <Wrench size={12} /> Skill
      </span>
    );
  }
  if (type === "mcp_server") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/10 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-300/10 dark:text-slate-300">
        <Server size={12} /> MCP Server
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-bold text-gray-500">
      Unclassified
    </span>
  );
}

export function TrendingBadge({ growth }: { growth: number }) {
  if (growth < 10) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
      <TrendingUp size={12} /> +{growth}
    </span>
  );
}

const NEW_ON_GITHUB_DAYS = 30;

/** True if the repo itself was created on GitHub recently — not just recently added to this directory. */
export function isNewOnGithub(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_ON_GITHUB_DAYS * 86_400_000;
}

export function NewBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
      <Sparkles size={12} /> New
    </span>
  );
}
