/** A single repository record as returned by the scraper. */
export interface Repo {
  name: string;
  owner: string;
  description: string;
  topics: string[];
  language: string | null;
  stars: number;
  forks: number;
  isArchived: boolean;
  lastPushedAt: string;
  url: string;
  /** Human-readable department name, resolved from the owner org slug. */
  department: string | null;
  /** URL to the repo's compressed SPDX SBOM, when available. */
  sbomPath: string | null;
  /** Package names from the repo's SBOM, or topics when no SBOM is available. */
  dependencies: string[];
}

/** Criteria used to filter a list of repositories. */
export interface QueryFilter {
  /** Match repos whose name contains this string (case-insensitive). */
  name?: string;
  /** Match repos that have all of these topics. */
  topics?: string[];
  /** Match repos written in this language (case-insensitive). */
  language?: string;
  /** When true only return repos that are not archived. */
  activeOnly?: boolean;
  /** Return repos with at least this many stars. */
  minStars?: number;
  /** Match repos belonging to this department (case-insensitive substring). */
  department?: string;
  /** Match repos that have all of these dependencies (case-insensitive). */
  dependencies?: string[];
}

/** The result of a query operation. */
export interface QueryResult {
  total: number;
  repos: Repo[];
}
