export const dynamic = "force-dynamic";

import { FilterBar } from "@/components/FilterBar";
import { RepoCollection } from "@/components/RepoCollection";
import { StateMessage } from "@/components/StateMessage";
import { UpAndComing } from "@/components/UpAndComing";
import { getFilterFacets, queryRepos } from "@/lib/query";
import type { QueryParams } from "@/lib/types";

export default function DirectoryPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const params: QueryParams = {
    q: searchParams.q,
    type: searchParams.type as QueryParams["type"],
    category: searchParams.category,
    language: searchParams.language,
    license: searchParams.license,
    sort: searchParams.sort as QueryParams["sort"],
    page: searchParams.page ? Number(searchParams.page) : 1,
  };
  const view = searchParams.view === "list" ? "list" : "grid";

  const isDefaultView = !params.q && !params.type && !params.category && !params.language && !params.license;

  const { repos, total } = queryRepos(params);
  const { languages, licenses } = getFilterFacets();

  const upAndComing = isDefaultView ? queryRepos({ sort: "trending7d", perPage: 8 }).repos : [];

  return (
    <div>
      <FilterBar languages={languages} licenses={licenses} />

      {isDefaultView && upAndComing.length > 0 && <UpAndComing repos={upAndComing} />}

      {total === 0 ? (
        <StateMessage
          variant="empty"
          title="No results"
          description="Try a different search term or clear a filter."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500">{total.toLocaleString()} results</p>
          <RepoCollection repos={repos} view={view} />
        </>
      )}
    </div>
  );
}
