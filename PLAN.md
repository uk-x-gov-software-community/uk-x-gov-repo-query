# Plan: Natural Language Query Engine for UK Gov Open Source Repos

## Overview

Build a natural language query interface on top of the
[xgov-opensource-repo-scraper](https://github.com/uk-x-gov-software-community/xgov-opensource-repo-scraper)
data. Users will be able to ask questions in plain English and receive filtered,
ranked results from the nightly-updated repos dataset.

**Data source:** `https://uk-x-gov-software-community.github.io/xgov-opensource-repo-scraper/repos.json`

---

## Architecture

```
repos.json (remote, nightly)
       │
       ▼
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Data Layer │────▶│  Query Engine    │────▶│  Output      │
│  (fetch +   │     │  (NL parser +    │     │  (formatted  │
│   cache)    │     │   filter/sort)   │     │   results)   │
└─────────────┘     └──────────────────┘     └──────────────┘
```

### Layers

1. **Data layer** — fetches `repos.json`, validates the shape, and caches it
   in memory (TTL: 1 hour). Exposes a typed `Repo[]` array to the rest of the
   system.

2. **Query engine** — parses a plain English query string into a structured
   `QueryFilter`, then applies it to the repo list.

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
  dependencies: string[];      // library names parsed from package.json / requirements.txt etc.
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

### `src/data/dependencies.ts`
- `parseDependencies(repo: RawRepo): string[]`
- If the scraper exposes manifest data, parse it here
- Fallback: derive from topics (e.g. topic `react`, `django`, `rails`)

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

Detecting libraries used requires at least one of:

1. **Scraper provides manifest data** — if `repos.json` includes a
   `dependencies` or `packageJson` field, use it directly. (To be confirmed
   once we inspect the live JSON.)

2. **Topic-based fallback** — many gov repos tag topics like `react`, `rails`,
   `django`. We treat these as a proxy for library use when no manifest data is
   available.

3. **Future: on-demand manifest fetch** — for a named repo, fetch
   `package.json` / `requirements.txt` / `go.mod` from GitHub and cache the
   result. Opt-in only (rate-limit aware).

The initial implementation uses approaches 1 and 2. Approach 3 is deferred.

---

## Testing Plan

- Unit tests for each NL rule in `src/nlp/rules.ts`
- Unit tests for `parseQuery` covering combined queries
- Unit tests for `queryRepos` with the new `department` and `dependencies` fields
- Unit test for `resolveDepartment` mapping
- Integration test that fetches a mock `repos.json` and runs an end-to-end query
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
    dependencies.ts
  nlp/
    parser.ts
    rules.ts
  __tests__/
    query.test.ts
    parser.test.ts
    departments.test.ts
data/
  org-to-department.json
```

---

## Future Work

- **LLM integration** — optionally pass the query through a small LLM to handle
  ambiguous or complex phrasing before the rule-based parser.
- **On-demand manifest fetching** — fetch live `package.json` / `requirements.txt`
  for richer dependency data.
- **Web UI** — a VitePress or lightweight HTML front-end over the query API.
- **Result ranking** — score results by relevance (star count, recency,
  match quality) rather than returning all matches equally.
- **Pagination** — for large result sets.
