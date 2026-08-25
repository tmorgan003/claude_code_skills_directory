export interface GithubRepoDetail {
  id: number;
  full_name: string;
  owner: { login: string };
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  license: { spdx_id: string } | null;
  topics: string[];
  html_url: string;
  created_at: string;
  pushed_at: string | null;
}

export type RepoType = "skill" | "mcp_server" | "unclassified";
export type PackageManager = "npm" | "pypi";

export interface ClassifyTypeInput {
  fullName: string;
  topics: string[];
  rootFiles: string[];
  subfolderHasSkillMd: boolean;
}

export interface QueryParams {
  q?: string;
  type?: RepoType;
  category?: string;
  language?: string;
  license?: string;
  sort?: "stars" | "updated" | "added" | "trending1d" | "trending7d" | "trending30d";
  page?: number;
  perPage?: number;
  includeHidden?: boolean;
}

export interface RunRefreshResult {
  runId: number;
  status: "success" | "partial" | "failed";
  reposAdded: number;
  reposUpdated: number;
  reposRemoved: number;
  errorLog: string[];
}
