# uk-x-gov-repo-query

> Search UK government open source repositories using plain English, built on top of [xgov-opensource-repo-scraper](https://github.com/uk-x-gov-software-community/xgov-opensource-repo-scraper).

[![CI](https://github.com/uk-x-gov-software-community/uk-x-gov-repo-query/actions/workflows/ci.yml/badge.svg)](https://github.com/uk-x-gov-software-community/uk-x-gov-repo-query/actions/workflows/ci.yml)
[![Docs](https://github.com/uk-x-gov-software-community/uk-x-gov-repo-query/actions/workflows/docs.yml/badge.svg)](https://uk-x-gov-software-community.github.io/uk-x-gov-repo-query/)

## What it does

Queries the nightly-updated dataset from the scraper and lets you filter repositories by:

- **Language** — `"Python repos"`, `"written in TypeScript"`
- **Department** — `"from HMRC"`, `"by GDS"`, `"by Home Office"`
- **Libraries used** — `"using react"`, `"built with django"`, `"that use express"` — backed by SPDX SBOM data where available, topics as fallback
- **Activity** — `"active"`, `"not archived"`
- **Stars** — `"more than 100 stars"`, `"50+ stars"`

Queries can combine any of the above: `"active Python repos from HMRC using django more than 10 stars"`.

## CLI

```bash
npm run build

# Rule-based parser (fast, no dependencies, works offline)
node dist/cli.js "active TypeScript repos from GDS"
node dist/cli.js "Python repos from HMRC using django"
node dist/cli.js "repos using react with more than 100 stars"

# LLM fallback — only invoked when the parser finds no criteria
# Handles freeform phrasing like "what does the tax office build in Python?"
node dist/cli.js "what does the tax office build in Python?" --llm claude
node dist/cli.js "repos from the driving licence people" --llm copilot
```

### LLM fallback

The `--llm` flag is optional and activates an AI fallback when the rule-based parser does not recognise the query. Two providers are supported:

| Flag | SDK | Requirement |
|---|---|---|
| `--llm claude` | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` env var |
| `--llm copilot` | `@github/copilot-sdk` | GitHub Copilot CLI installed and authenticated |

Neither SDK is a required dependency — install only the one you need:

```bash
npm install @anthropic-ai/sdk       # for --llm claude
npm install @github/copilot-sdk     # for --llm copilot
```

## Library usage

```typescript
import { parseQuery, fetchRepos, queryRepos, enrichReposWithDependencies } from "uk-x-gov-repo-query";

// Rule-based query parsing
const filter = parseQuery("active Python repos from HMRC using django");
// → { activeOnly: true, language: "Python", department: "HMRC", dependencies: ["django"] }

// Fetch nightly data (cached in memory for 1 hour)
const repos = await fetchRepos();

// Optionally enrich with SBOM dependency data before filtering
const enriched = await enrichReposWithDependencies(repos);

const result = queryRepos(enriched, filter);
console.log(result.total, result.repos);
```

### LLM fallback in code

```typescript
import { parseQuery, extractFilterWithLlm, isEmptyFilter } from "uk-x-gov-repo-query";

let filter = parseQuery(query);
if (isEmptyFilter(filter)) {
  filter = await extractFilterWithLlm(query, "claude"); // or "copilot"
}
```

## Architecture

```
repos.json (nightly)    sbom/{org}/{repo}.json.gz (lazy, per-repo)
        │                          │
        └──────────┬───────────────┘
                   ▼
        ┌─────────────────┐     ┌──────────────────────────────┐
        │   Data layer    │────▶│  Query engine                │
        │ fetch · cache   │     │  Rule parser → QueryFilter   │
        │ SBOM · dept map │     │  LLM fallback (optional)     │
        └─────────────────┘     └──────────────────────────────┘
```

- **Data layer** — `src/data/` — fetches `repos.json`, resolves departments from a 44-org mapping, lazy-loads SPDX SBOMs (gzip) for dependency data
- **Rule parser** — `src/nlp/rules.ts` + `src/nlp/parser.ts` — ordered regex rules, deterministic, offline, <1 ms
- **LLM providers** — `src/nlp/providers/` — Claude (tool use for structured output) and GitHub Copilot SDK; both are optional peer dependencies loaded dynamically

## Development

```bash
npm install
npm test            # 87 tests
npm run build       # compile with esbuild → dist/
npm run lint        # Biome check
npm run lint:fix    # Biome auto-fix
npm run docs:dev    # VitePress local preview
```

## Documentation

Full docs at <https://uk-x-gov-software-community.github.io/uk-x-gov-repo-query/>

## Licence

[MIT](LICENSE)
