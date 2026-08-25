import type { PackageManager } from "./types";

const MAX_SUMMARY_LENGTH = 160;

/** Strips common markdown syntax down to plain text. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}

/** Uses the GitHub description when present; otherwise the first meaningful README paragraph. */
export function extractPurposeSummary(description: string | null, readme: string | null): string | null {
  if (description && description.trim().length >= 8) {
    return description.trim();
  }

  if (!readme) return null;

  const plain = stripMarkdown(readme);
  const paragraphs = plain
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 20 && !/^(badges?|table of contents)$/i.test(p));

  const first = paragraphs[0];
  if (!first) return null;
  return truncate(first, MAX_SUMMARY_LENGTH);
}

const INSTALL_HEADING_RE = /^#{1,6}\s*(installation|install|usage|getting started|quick ?start)/im;
const FENCE_RE = /```(?:[a-z]*\n)?([\s\S]*?)```/gi;

/** Prefers a code block that follows an install/usage heading; falls back to the first code block. */
export function extractInstallSnippet(readme: string | null): string | null {
  if (!readme) return null;

  const headingMatch = INSTALL_HEADING_RE.exec(readme);
  if (headingMatch) {
    const after = readme.slice(headingMatch.index + headingMatch[0].length);
    const fenceAfter = FENCE_RE.exec(after);
    FENCE_RE.lastIndex = 0;
    if (fenceAfter?.[1]?.trim()) return fenceAfter[1].trim();
  }

  const first = FENCE_RE.exec(readme);
  FENCE_RE.lastIndex = 0;
  return first?.[1]?.trim() || null;
}

const NPM_RE = /\bnpx\s+(@?[\w./-]+)|npm\s+(?:i|install)\s+(?:-g\s+)?(@?[\w./-]+)/i;
const PIP_RE = /pip3?\s+install\s+([\w.-]+)/i;

/** Best-effort package URL from install snippet / README text. npm wins when both patterns match. */
export function extractPackageUrl(
  text: string | null
): { url: string; manager: PackageManager } | null {
  if (!text) return null;

  const npmMatch = NPM_RE.exec(text);
  if (npmMatch) {
    const pkg = npmMatch[1] ?? npmMatch[2];
    if (pkg) return { url: `https://www.npmjs.com/package/${pkg}`, manager: "npm" };
  }

  const pipMatch = PIP_RE.exec(text);
  if (pipMatch?.[1]) {
    return { url: `https://pypi.org/project/${pipMatch[1]}/`, manager: "pypi" };
  }

  return null;
}
