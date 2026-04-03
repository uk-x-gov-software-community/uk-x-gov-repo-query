import type { QueryFilter, QueryResult, Repo } from "./types.js";

/**
 * Filter a list of repos according to the supplied criteria.
 *
 * Each criterion is optional – omitting it means "match anything".
 * All supplied criteria are combined with logical AND.
 */
export function queryRepos(repos: Repo[], filter: QueryFilter): QueryResult {
  const matched = repos.filter((repo) => {
    if (filter.name !== undefined) {
      if (!repo.name.toLowerCase().includes(filter.name.toLowerCase())) {
        return false;
      }
    }

    if (filter.topics !== undefined && filter.topics.length > 0) {
      const repoTopics = repo.topics.map((t) => t.toLowerCase());
      const allMatch = filter.topics.every((t) => repoTopics.includes(t.toLowerCase()));
      if (!allMatch) return false;
    }

    if (filter.language !== undefined) {
      if (repo.language?.toLowerCase() !== filter.language.toLowerCase()) {
        return false;
      }
    }

    if (filter.activeOnly === true && repo.isArchived) {
      return false;
    }

    if (filter.minStars !== undefined && repo.stars < filter.minStars) {
      return false;
    }

    if (filter.department !== undefined) {
      const term = filter.department.toLowerCase();
      const deptMatch = repo.department?.toLowerCase().includes(term) ?? false;
      const ownerMatch = repo.owner.toLowerCase().includes(term);
      if (!deptMatch && !ownerMatch) return false;
    }

    if (filter.dependencies !== undefined && filter.dependencies.length > 0) {
      const repoDeps = repo.dependencies.map((d) => d.toLowerCase());
      const allMatch = filter.dependencies.every((d) => repoDeps.includes(d.toLowerCase()));
      if (!allMatch) return false;
    }

    return true;
  });

  return { total: matched.length, repos: matched };
}

/**
 * Sort repos by star count, descending.
 */
export function sortByStars(repos: Repo[]): Repo[] {
  return [...repos].sort((a, b) => b.stars - a.stars);
}

/**
 * Group repos by programming language.
 *
 * Repos with no language are grouped under the key `"unknown"`.
 */
export function groupByLanguage(repos: Repo[]): Record<string, Repo[]> {
  const groups: Record<string, Repo[]> = {};

  for (const repo of repos) {
    const key = repo.language?.toLowerCase() ?? "unknown";
    const group = groups[key];
    if (group !== undefined) {
      group.push(repo);
    } else {
      groups[key] = [repo];
    }
  }

  return groups;
}
