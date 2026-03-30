# Plan: Natural Language Query Engine for UK Gov Open Source Repos

## Overview

Build a natural language query interface on top of the
[xgov-opensource-repo-scraper](https://github.com/uk-x-gov-software-community/xgov-opensource-repo-scraper)
data. Users will be able to ask questions in plain English and receive filtered,
ranked results from the nightly-updated repos dataset.

**Data sources** (all served from GitHub Pages, updated nightly):

| URL | Contents |
|---|---|
| `.../repos.json` | Array of repo metadata objects, includes a `sbomPath` field per repo where an SBOM is available |
| `.../sbom/{org}/{repo}.json.gz` | Per-repo SBOM in compressed SPDX JSON — full dependency tree with versions and licences |
| `.../sbom.json` | Consolidated SBOM for all repos in CycloneDX format |

The SBOM data is generated from GitHub's dependency graph API, giving accurate library-level dependency information across all supported ecosystems (npm, PyPI, Maven, Go modules, etc.).

---

## Architecture

```
repos.json          sbom/{org}/{repo}.json.gz
(nightly)           (nightly, lazy-loaded per repo)
     │                          │
     └──────────┬───────────────┘
                ▼
     ┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
     │   Data Layer    │────▶│  Query Engine    │────▶│  Output      │
     │ (fetch, enrich, │     │  (NL parser +    │     │  (formatted  │
     │  cache, index)  │     │   filter/sort)   │     │   results)   │
     └─────────────────┘     └──────────────────┘     └──────────────┘
```

### Layers

1. **Data layer** — fetches `repos.json`, enriches each record with
   department (via org mapping) and dependencies (from SBOM), validates the
   shape, and caches in memory (TTL: 1 hour). SBOM files are fetched lazily
   and cached separately — only loaded when a dependency filter is active.
   Exposes a typed `Repo[]` array to the rest of the system.

2. **Query engine** — parses a plain English query string into a structured
   `QueryFilter`, then applies it to the enriched repo list.

3. **Output layer** — formats results as JSON (library consumers) or a
   human-readable table (CLI).

---

## Data Model

The scraper JSON is expected to contain an array of repository objects. We will
map these to the following extended `Repo` type (extending the existing
`src/types.ts`):

```ts
interface Repo {
  // existing fields
  name: string;
  owner: string;           // GitHub org — used to infer department
  description: string;
  topics: string[];
  language: string | null;
  stars: number;
  forks: number;
  isArchived: boolean;
  lastPushedAt: string;
  url: string;

  // new fields (populated from scraper or derived)
  department: string | null;   // mapped from owner via org→department lookup
  sbomPath: string | null;     // path to compressed SPDX SBOM, as provided by repos.json
  dependencies: string[];      // package names extracted from the repo's SBOM (lazy-loaded)
}
```

A static `org-to-department.json` mapping file will translate GitHub org names
(e.g. `alphagov`, `DFE-Digital`, `UKHomeOffice`) to human-readable department
names (e.g. `GDS`, `Department for Education`, `Home Office`).

---

## Natural Language Query Engine

### Approach

Use a **rule-based parser** with no external AI dependency. This keeps the tool
fast, offline-capable, and auditable. The parser uses keyword extraction and
pattern matching to translate a query string into a `QueryFilter` object.

A later enhancement could optionally integrate an LLM for more complex queries
(see Future Work).

### Pattern matching rules

| User says | Parsed as |
|---|---|
| `"python repos"` / `"written in Python"` | `language: "python"` |
| `"from HMRC"` / `"by Home Office"` / `"in GDS"` | `department: "..."` |
| `"using React"` / `"that use express"` / `"with django"` | `dependencies: ["react"]` |
| `"active"` / `"not archived"` | `activeOnly: true` |
| `"more than 10 stars"` / `"at least 50 stars"` | `minStars: 10` |
| `"javascript and uses express"` | combined AND filter |

Patterns are defined as an ordered list of regex rules in `src/nlp/rules.ts`,
making them easy to extend.

### Query filter (extended)

```ts
interface QueryFilter {
  name?: string;
  language?: string;
  department?: string;       // NEW — matches human-readable or slug form
  dependencies?: string[];   // NEW — all listed libs must be present
  topics?: string[];
  activeOnly?: boolean;
  minStars?: number;
}
```

---

## Modules to Build

### `src/data/fetch.ts`
- `fetchRepos(): Promise<Repo[]>` — fetches and validates the scraper JSON
- In-memory cache with configurable TTL
- Throws typed errors on fetch failure or schema mismatch

### `src/data/departments.ts`
- `resolveDepartment(owner: string): string | null`
- Static mapping from GitHub org slug → department name
- Ships with a `data/org-to-department.json` seed file

### `src/data/sbom.ts`
- `fetchDependencies(sbomPath: string): Promise<string[]>`
- Fetches the gzip-compressed SPDX JSON file for a single repo
- Decompresses and extracts the `packages[].name` array (these are the library names)
- Caches result in memory keyed by `sbomPath` (TTL: 1 hour, same as repos)
- Returns `[]` if no SBOM is available for the repo
- Falls back to repo `topics` array when no SBOM path is present

### `src/nlp/parser.ts`
- `parseQuery(query: string): QueryFilter`
- Runs the query string through the ordered rule list
- Returns a `QueryFilter` with all matched criteria populated

### `src/nlp/rules.ts`
- Exported array of `Rule` objects: `{ pattern: RegExp, apply: (match, filter) => void }`
- Language rules, department rules, dependency rules, activity rules, star rules

### `src/query.ts` (extend existing)
- Add `department` and `dependencies` fields to the filter logic in `queryRepos`

### `src/types.ts` (extend existing)
- Add `department` and `dependencies` to `Repo`
- Add `department` and `dependencies` to `QueryFilter`

### `src/index.ts` (extend existing)
- Export `parseQuery` and `fetchRepos` as part of the public API

### `src/cli.ts` (new)
- Minimal CLI entry point: `node dist/cli.js "show me Python repos from HMRC"`
- Prints a formatted table of results to stdout

---

## Dependency and Library Filtering

The scraper publishes per-repo SBOMs as compressed SPDX JSON files at
predictable URLs (`/sbom/{org}/{repo}.json.gz`). `repos.json` includes a
`sbomPath` field pointing to the file for each repo where one is available.

### Resolution strategy (in priority order)

1. **SBOM (primary)** — fetch the repo's SPDX SBOM, decompress it, extract
   `packages[].name`. This gives the full dependency tree including transitive
   deps, version numbers, and licence info. Coverage is limited to repos where
   GitHub's dependency graph is enabled.

2. **Topic fallback** — for repos without an SBOM, treat GitHub topics as a
   coarse proxy (e.g. topic `react`, `django`, `rails`). Clearly less accurate
   but universally available.

### Performance

SBOM files are only fetched when a `dependencies` filter is active. They are
cached in memory for 1 hour. A dependency-filtered query will fan out SBOM
fetches concurrently (capped at 10 parallel requests) before applying the
filter, so the first query with a dependency filter may have higher latency.
Subsequent queries use the cache.

---

## Testing Plan

- Unit tests for each NL rule in `src/nlp/rules.ts`
- Unit tests for `parseQuery` covering combined queries
- Unit tests for `queryRepos` with the new `department` and `dependencies` fields
- Unit test for `resolveDepartment` mapping
- Unit tests for SBOM fetch and SPDX package name extraction with mock gzip responses
- Integration test that fetches a mock `repos.json` + mock SBOM and runs an end-to-end query
- All tests continue to use Vitest (already scaffolded)

---

## File Structure (after implementation)

```
src/
  cli.ts
  index.ts
  query.ts
  types.ts
  data/
    fetch.ts
    departments.ts
    sbom.ts
  nlp/
    parser.ts
    rules.ts
  __tests__/
    query.test.ts
    parser.test.ts
    departments.test.ts
    sbom.test.ts
data/
  org-to-department.json
```

---

## Future Work

- **LLM integration** — optionally pass the query through a small LLM to handle
  ambiguous or complex phrasing before the rule-based parser.
- **Licence filtering** — SBOMs include licence info per package; expose this as a filter.
- **Transitive dependency depth** — distinguish direct vs transitive deps in filter results.
- **Web UI** — a VitePress or lightweight HTML front-end over the query API.
- **Result ranking** — score results by relevance (star count, recency,
  match quality) rather than returning all matches equally.
- **Pagination** — for large result sets.
