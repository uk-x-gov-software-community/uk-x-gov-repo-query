#!/usr/bin/env node

import { fetchRepos } from "./data/fetch.js";
import { enrichReposWithDependencies } from "./data/sbom.js";
import { extractFilterWithLlm, isEmptyFilter, type LlmProviderName } from "./nlp/llm.js";
import { parseQuery } from "./nlp/parser.js";
import { queryRepos, sortByStars } from "./query.js";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
let query = "";
let llmProvider: LlmProviderName | undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (arg === "--llm" && i + 1 < args.length) {
    const val = args[++i];
    if (val === "copilot" || val === "claude") {
      llmProvider = val;
    } else {
      console.error(`Unknown --llm provider "${val}". Use "copilot" or "claude".`);
      process.exit(1);
    }
  } else if (!arg.startsWith("--")) {
    query = arg;
  }
}

if (query === "" || query === "--help" || query === "-h") {
  console.log(`uk-x-gov-repo-query — search UK government open source repositories

Usage:
  node dist/cli.js "<query>" [--llm copilot|claude]

Options:
  --llm copilot   Fall back to GitHub Copilot (requires @github/copilot-sdk)
  --llm claude    Fall back to Claude AI (requires @anthropic-ai/sdk + ANTHROPIC_API_KEY)

The rule-based parser runs first. The LLM is only called when the parser
does not recognise any criteria in the query.

Examples:
  node dist/cli.js "Python repos from HMRC"
  node dist/cli.js "active TypeScript repos from GDS with more than 100 stars"
  node dist/cli.js "repos using react built with webpack"
  node dist/cli.js "show me what the tax office builds" --llm claude
  node dist/cli.js "repos from the driving licence people" --llm copilot`);
  process.exit(query === "" ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Parse query — rule-based first, LLM fallback if nothing was recognised
// ---------------------------------------------------------------------------

let filter = parseQuery(query);

if (isEmptyFilter(filter) && llmProvider !== undefined) {
  process.stderr.write(
    `Rule parser found no criteria — falling back to ${llmProvider} LLM…\n`,
  );
  try {
    filter = await extractFilterWithLlm(query, llmProvider);
  } catch (err) {
    console.error(
      `LLM fallback failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Fetch, enrich, filter, output
// ---------------------------------------------------------------------------

process.stderr.write("Fetching repos…\n");
let repos = await fetchRepos();

if (filter.dependencies !== undefined && filter.dependencies.length > 0) {
  process.stderr.write("Loading dependency data (this may take a moment)…\n");
  repos = await enrichReposWithDependencies(repos);
}

const result = queryRepos(sortByStars(repos), filter);

if (result.total === 0) {
  console.log("No repositories matched your query.");
  process.exit(0);
}

const plural = result.total === 1 ? "y" : "ies";
console.log(`\nFound ${result.total} repositor${plural}:\n`);

const W_NAME = 42;
const W_DEPT = 32;
const W_LANG = 14;
const W_STARS = 6;
const W_TOTAL = W_NAME + W_DEPT + W_LANG + W_STARS;

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}\u2026` : s;
}

console.log(
  "Name".padEnd(W_NAME) +
    "Department".padEnd(W_DEPT) +
    "Language".padEnd(W_LANG) +
    "Stars".padStart(W_STARS),
);
console.log("\u2500".repeat(W_TOTAL));

for (const repo of result.repos) {
  const dept = repo.department ?? repo.owner;
  const lang = repo.language ?? "\u2014";
  console.log(
    truncate(repo.name, W_NAME).padEnd(W_NAME) +
      truncate(dept, W_DEPT).padEnd(W_DEPT) +
      truncate(lang, W_LANG).padEnd(W_LANG) +
      String(repo.stars).padStart(W_STARS),
  );
}
