import { NextResponse } from "next/server";
import { queryRepos } from "@/lib/query";
import { isAuthorized } from "@/lib/auth";
import type { QueryParams } from "@/lib/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeHidden = url.searchParams.get("includeHidden") === "1";

  if (includeHidden && !isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params: QueryParams = {
    q: url.searchParams.get("q") ?? undefined,
    type: (url.searchParams.get("type") as QueryParams["type"]) ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
    license: url.searchParams.get("license") ?? undefined,
    sort: (url.searchParams.get("sort") as QueryParams["sort"]) ?? undefined,
    page: Number(url.searchParams.get("page") ?? "1"),
    perPage: Number(url.searchParams.get("perPage") ?? "24"),
    includeHidden,
  };

  const result = queryRepos(params);
  return NextResponse.json(result);
}
