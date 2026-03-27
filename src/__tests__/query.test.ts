import { describe, expect, it } from "vitest";
import { groupByLanguage, queryRepos, sortByStars } from "../query.js";
import type { Repo } from "../types.js";

const REPOS: Repo[] = [
  {
    name: "govuk-frontend",
    owner: "alphagov",
    description: "GOV.UK Frontend contains the code you need to start building a user interface",
    topics: ["frontend", "govuk", "scss"],
    language: "JavaScript",
    stars: 1200,
    forks: 400,
    isArchived: false,
    lastPushedAt: "2024-01-10T00:00:00Z",
    url: "https://github.com/alphagov/govuk-frontend",
  },
  {
    name: "govuk-design-system",
    owner: "alphagov",
    description: "GOV.UK Design System",
    topics: ["design-system", "govuk"],
    language: "JavaScript",
    stars: 900,
    forks: 200,
    isArchived: false,
    lastPushedAt: "2024-01-05T00:00:00Z",
    url: "https://github.com/alphagov/govuk-design-system",
  },
  {
    name: "legacy-tool",
    owner: "moj-analytical-services",
    description: "An old tool",
    topics: ["python"],
    language: "Python",
    stars: 30,
    forks: 5,
    isArchived: true,
    lastPushedAt: "2020-06-01T00:00:00Z",
    url: "https://github.com/moj-analytical-services/legacy-tool",
  },
  {
    name: "data-pipeline",
    owner: "moj-analytical-services",
    description: "A data processing pipeline",
    topics: ["python", "data"],
    language: "Python",
    stars: 200,
    forks: 50,
    isArchived: false,
    lastPushedAt: "2023-11-20T00:00:00Z",
    url: "https://github.com/moj-analytical-services/data-pipeline",
  },
  {
    name: "unknown-lang-repo",
    owner: "some-org",
    description: "Repo with no language",
    topics: [],
    language: null,
    stars: 10,
    forks: 1,
    isArchived: false,
    lastPushedAt: "2023-01-01T00:00:00Z",
    url: "https://github.com/some-org/unknown-lang-repo",
  },
];

describe("queryRepos", () => {
  it("returns all repos when filter is empty", () => {
    const result = queryRepos(REPOS, {});
    expect(result.total).toBe(REPOS.length);
    expect(result.repos).toHaveLength(REPOS.length);
  });

  it("filters by name (case-insensitive)", () => {
    const result = queryRepos(REPOS, { name: "GOVUK" });
    expect(result.total).toBe(2);
    expect(result.repos.map((r) => r.name)).toEqual(["govuk-frontend", "govuk-design-system"]);
  });

  it("filters by a single topic", () => {
    const result = queryRepos(REPOS, { topics: ["python"] });
    expect(result.total).toBe(2);
  });

  it("filters by multiple topics (AND logic)", () => {
    const result = queryRepos(REPOS, { topics: ["python", "data"] });
    expect(result.total).toBe(1);
    expect(result.repos[0]?.name).toBe("data-pipeline");
  });

  it("filters by language (case-insensitive)", () => {
    const result = queryRepos(REPOS, { language: "javascript" });
    expect(result.total).toBe(2);
  });

  it("filters out archived repos when activeOnly is true", () => {
    const result = queryRepos(REPOS, { activeOnly: true });
    expect(result.repos.every((r) => !r.isArchived)).toBe(true);
    expect(result.total).toBe(4);
  });

  it("filters by minimum stars", () => {
    const result = queryRepos(REPOS, { minStars: 500 });
    expect(result.total).toBe(2);
    expect(result.repos.every((r) => r.stars >= 500)).toBe(true);
  });

  it("combines multiple filters with AND logic", () => {
    const result = queryRepos(REPOS, {
      language: "JavaScript",
      minStars: 1000,
      activeOnly: true,
    });
    expect(result.total).toBe(1);
    expect(result.repos[0]?.name).toBe("govuk-frontend");
  });

  it("returns empty result when no repos match", () => {
    const result = queryRepos(REPOS, { name: "does-not-exist" });
    expect(result.total).toBe(0);
    expect(result.repos).toHaveLength(0);
  });
});

describe("sortByStars", () => {
  it("sorts repos by stars in descending order", () => {
    const sorted = sortByStars(REPOS);
    const stars = sorted.map((r) => r.stars);
    expect(stars).toEqual([...stars].sort((a, b) => b - a));
  });

  it("does not mutate the original array", () => {
    const original = [...REPOS];
    sortByStars(REPOS);
    expect(REPOS).toEqual(original);
  });
});

describe("groupByLanguage", () => {
  it("groups repos by lowercase language key", () => {
    const groups = groupByLanguage(REPOS);
    expect(Object.keys(groups).sort()).toEqual(["javascript", "python", "unknown"]);
    expect(groups.javascript).toHaveLength(2);
    expect(groups.python).toHaveLength(2);
    expect(groups.unknown).toHaveLength(1);
  });

  it("places repos with null language under 'unknown'", () => {
    const groups = groupByLanguage(REPOS);
    expect(groups.unknown?.[0]?.name).toBe("unknown-lang-repo");
  });
});
