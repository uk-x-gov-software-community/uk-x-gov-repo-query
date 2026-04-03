import { promisify } from "node:util";
import { gunzip } from "node:zlib";
import type { Repo } from "../types.js";

const gunzipAsync = promisify(gunzip);

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CONCURRENCY_LIMIT = 10;

interface SbomCacheEntry {
  deps: string[];
  fetchedAt: number;
}

const sbomCache = new Map<string, SbomCacheEntry>();

interface SpdxDocument {
  packages?: Array<{ name: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/**
 * Fetch and decompress a per-repo SPDX SBOM at the given URL, returning
 * the list of package names (lowercased). Results are cached for 1 hour.
 *
 * Returns an empty array if the SBOM is unreachable or malformed.
 */
export async function fetchDependencies(sbomUrl: string): Promise<string[]> {
  const now = Date.now();
  const cached = sbomCache.get(sbomUrl);
  if (cached !== undefined && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.deps;
  }

  try {
    const response = await fetch(sbomUrl);
    if (!response.ok) {
      sbomCache.set(sbomUrl, { deps: [], fetchedAt: now });
      return [];
    }

    const compressed = Buffer.from(await response.arrayBuffer());
    const decompressed = await gunzipAsync(compressed);
    const spdx = JSON.parse(decompressed.toString("utf8")) as SpdxDocument;
    const deps = (spdx.packages ?? []).map((p) => p.name.toLowerCase());

    sbomCache.set(sbomUrl, { deps, fetchedAt: now });
    return deps;
  } catch {
    sbomCache.set(sbomUrl, { deps: [], fetchedAt: now });
    return [];
  }
}

/** Clear the SBOM in-memory cache (useful for testing). */
export function clearSbomCache(): void {
  sbomCache.clear();
}

/**
 * Enrich a list of repos with dependency data fetched from their SBOMs.
 * Repos without an sbomPath fall back to their topics array as a proxy.
 * Fetches run concurrently, capped at CONCURRENCY_LIMIT parallel requests.
 */
export async function enrichReposWithDependencies(repos: Repo[]): Promise<Repo[]> {
  const results: Repo[] = [];

  for (let i = 0; i < repos.length; i += CONCURRENCY_LIMIT) {
    const batch = repos.slice(i, i + CONCURRENCY_LIMIT);
    const enriched = await Promise.all(
      batch.map(async (repo) => {
        if (repo.sbomPath !== null) {
          const deps = await fetchDependencies(repo.sbomPath);
          return { ...repo, dependencies: deps };
        }
        return { ...repo, dependencies: repo.topics };
      })
    );
    results.push(...enriched);
  }

  return results;
}
