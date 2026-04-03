import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSbomCache, enrichReposWithDependencies, fetchDependencies } from "../data/sbom.js";
import type { Repo } from "../types.js";

let urlCounter = 0;
function uniqueUrl(): string {
  return `https://example.com/sbom/org/repo-${++urlCounter}.json.gz`;
}

function makeGzippedSpdx(packageNames: string[]): Buffer {
  const spdx = {
    spdxVersion: "SPDX-2.3",
    packages: packageNames.map((name) => ({ name, versionInfo: "1.0.0" })),
  };
  return gzipSync(Buffer.from(JSON.stringify(spdx)));
}

function makeFetchMock(compressed: Buffer) {
  // Use Buffer.from to get a properly-sized ArrayBuffer (no pool offset issues)
  const ab = compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength
  );
  return vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(ab),
  });
}

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    name: "test-repo",
    owner: "test-org",
    description: "A test repo",
    topics: ["topic-a", "topic-b"],
    language: "TypeScript",
    stars: 10,
    forks: 1,
    isArchived: false,
    lastPushedAt: "2024-01-01T00:00:00Z",
    url: "https://github.com/test-org/test-repo",
    department: null,
    sbomPath: null,
    dependencies: [],
    ...overrides,
  };
}

afterEach(() => {
  clearSbomCache();
  vi.unstubAllGlobals();
});

describe("fetchDependencies", () => {
  it("fetches, decompresses and returns package names from an SPDX SBOM", async () => {
    vi.stubGlobal("fetch", makeFetchMock(makeGzippedSpdx(["express", "lodash", "react"])));

    const deps = await fetchDependencies(uniqueUrl());
    expect(deps).toEqual(["express", "lodash", "react"]);
  });

  it("returns an empty array when the SBOM endpoint returns a non-OK status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const deps = await fetchDependencies(uniqueUrl());
    expect(deps).toEqual([]);
  });

  it("returns an empty array when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const deps = await fetchDependencies(uniqueUrl());
    expect(deps).toEqual([]);
  });

  it("caches results so fetch is only called once", async () => {
    const mockFetch = makeFetchMock(makeGzippedSpdx(["django"]));
    vi.stubGlobal("fetch", mockFetch);

    const url = uniqueUrl();
    await fetchDependencies(url);
    await fetchDependencies(url);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("lowercases package names", async () => {
    vi.stubGlobal("fetch", makeFetchMock(makeGzippedSpdx(["Express", "LODASH"])));

    const deps = await fetchDependencies(uniqueUrl());
    expect(deps).toEqual(["express", "lodash"]);
  });
});

describe("enrichReposWithDependencies", () => {
  it("enriches repos that have an sbomPath", async () => {
    vi.stubGlobal("fetch", makeFetchMock(makeGzippedSpdx(["pandas", "numpy"])));

    const url = uniqueUrl();
    const repo = makeRepo({ sbomPath: url });
    const [enriched] = await enrichReposWithDependencies([repo]);

    expect(enriched?.dependencies).toEqual(["pandas", "numpy"]);
  });

  it("falls back to topics when sbomPath is null", async () => {
    const repo = makeRepo({ sbomPath: null, topics: ["react", "typescript"] });
    const [enriched] = await enrichReposWithDependencies([repo]);

    expect(enriched?.dependencies).toEqual(["react", "typescript"]);
  });

  it("processes all repos and returns the same count", async () => {
    const repos = [
      makeRepo({ name: "a", sbomPath: null }),
      makeRepo({ name: "b", sbomPath: null }),
      makeRepo({ name: "c", sbomPath: null }),
    ];
    const enriched = await enrichReposWithDependencies(repos);
    expect(enriched).toHaveLength(3);
  });
});
