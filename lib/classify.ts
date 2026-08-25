import type { ClassifyTypeInput, RepoType } from "./types";

const MCP_NAME_RE = /mcp[-_]?server|\bmcp\b/i;
const MCP_MANIFESTS = ["mcp.json", "server.json"];

/**
 * Priority order:
 * 1. SKILL.md at root or in a subfolder -> skill
 * 2. name/topics look MCP-shaped AND a manifest file is present -> mcp_server
 * 3. topics directly state the type -> matching type
 * 4. otherwise -> unclassified
 */
export function classifyType(input: ClassifyTypeInput): RepoType {
  const { fullName, topics, rootFiles, subfolderHasSkillMd } = input;

  if (rootFiles.includes("SKILL.md") || subfolderHasSkillMd) {
    return "skill";
  }

  const looksMcp = MCP_NAME_RE.test(fullName) || topics.some((t) => MCP_NAME_RE.test(t));
  const hasManifest = rootFiles.some((f) => MCP_MANIFESTS.includes(f));
  if (looksMcp && hasManifest) {
    return "mcp_server";
  }

  if (topics.some((t) => /claude-skill|claude-code-skill/i.test(t))) {
    return "skill";
  }
  if (topics.some((t) => /mcp-server|model-context-protocol/i.test(t))) {
    return "mcp_server";
  }

  return "unclassified";
}

interface CategoryRule {
  category: string;
  pattern: RegExp;
}

const CATEGORY_RULES: CategoryRule[] = [
  { category: "security", pattern: /\b(security|auth|vulnerabilit\w*|secret|encrypt\w*|compliance)\b/i },
  { category: "data", pattern: /\b(database|sql|postgres\w*|mysql|sqlite|mongo\w*|redis|data|analytics|etl)\b/i },
  { category: "web", pattern: /\b(api|http|rest|graphql|web|browser|fetch|scrape\w*)\b/i },
  { category: "docs", pattern: /\b(docs?|documentation|readme|markdown|wiki|knowledge)\b/i },
  { category: "devtools", pattern: /\b(cli|developer[- ]?tools?|dev[- ]?tools?|lint\w*|debug\w*|build|test(?:ing)?|git)\b/i },
  { category: "productivity", pattern: /\b(productivity|task\w*|notes?|calendar|email|slack|notion|todo)\b/i },
];

/** First matching category wins; falls back to "other". */
export function classifyCategory(text: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return "other";
}
