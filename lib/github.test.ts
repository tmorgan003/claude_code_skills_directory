import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCodeSearchHasSkillMd, fetchRepoDetails, RateLimitError } from "./github";

describe("github client retry/backoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retries transient 5xx failures then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1, full_name: "a/b" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchRepoDetails("a/b");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result?.full_name).toBe("a/b");
  });

  it("gives up after exhausting retries on persistent 5xx failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchRepoDetails("a/b");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial attempt + 3 retries
  });

  it("throws RateLimitError immediately on 403 with remaining=0, without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 60),
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchRepoDetails("a/b")).rejects.toBeInstanceOf(RateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetchCodeSearchHasSkillMd degrades to false on a rate limit instead of throwing", async () => {
    const originalToken = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = "test-token";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 60),
          "x-ratelimit-resource": "code_search",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCodeSearchHasSkillMd("a/b")).resolves.toBe(false);

    process.env.GITHUB_TOKEN = originalToken;
  });
});
