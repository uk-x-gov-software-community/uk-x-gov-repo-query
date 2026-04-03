# Getting Started

## Installation

```bash
npm install uk-x-gov-repo-query
```

## Quick Start

```typescript
import { queryRepos, sortByStars } from "uk-x-gov-repo-query";
import type { Repo } from "uk-x-gov-repo-query";

// Suppose `repos` is fetched from the x-gov scraper API
const repos: Repo[] = await fetchRepos();

// Find all active TypeScript repos with at least 50 stars
const result = queryRepos(repos, {
  language: "TypeScript",
  activeOnly: true,
  minStars: 50,
});

console.log(`Found ${result.total} repos`);

// Sort by most popular
const sorted = sortByStars(result.repos);
sorted.forEach((r) => console.log(`${r.owner}/${r.name} ⭐ ${r.stars}`));
```

## Requirements

- **Node.js** 24 or later
- **TypeScript** 5.0 or later (for type definitions)
