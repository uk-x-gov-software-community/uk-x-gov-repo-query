import type { Repo } from "../types.js";
import { resolveDepartment } from "./departments.js";

const REPOS_URL =
  "https://uk-x-gov-software-community.github.io/xgov-opensource-repo-scraper/repos.json";

const BASE_URL =
  "https://uk-x-gov-software-community.github.io/xgov-opensource-repo-scraper";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface ReposCache {
  repos: Repo[];
  fetchedAt: number;
}

let cache: ReposCache | null = null;

/** Shape of a raw repo record in the scraper JSON (best-effort). */
interface RawRepo {
  name: string;
  owner: string;
  description: string | null;
  topics?: string[] | null;
  language: string | null;
  stars: number;
  forks: number;
  isArchived: boolean;
  lastPushedAt: string;
  url: string;
  sbomPath?: string | null;
  [key: string]: unknown;
}

function resolvesbomUrl(path: string | null | undefined): string | null {
  if (path == null) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function toRepo(raw: RawRepo): Repo {
  return {
    name: raw.name,
    owner: raw.owner,
    description: raw.description ?? "",
    topics: raw.topics ?? [],
    language: raw.language,
    stars: raw.stars,
    forks: raw.forks,
    isArchived: raw.isArchived,
    lastPushedAt: raw.lastPushedAt,
    url: raw.url,
    department: resolveDepartment(raw.owner),
    sbomPath: resolvesbomUrl(raw.sbomPath),
    dependencies: [],
  };
}

/**
 * Fetch the full list of repos from the scraper JSON endpoint.
 * Results are cached in memory for 1 hour.
 */
export async function fetchRepos(): Promise<Repo[]> {
  const now = Date.now();
  if (cache !== null && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.repos;
  }

  const response = await fetch(REPOS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch repos: HTTP ${response.status}`);
  }

  const raw = (await response.json()) as RawRepo[];
  const repos = raw.map(toRepo);

  cache = { repos, fetchedAt: now };
  return repos;
}

/** Clear the in-memory repos cache (useful for testing). */
export function clearReposCache(): void {
  cache = null;
}
