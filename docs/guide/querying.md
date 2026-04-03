# Querying Repositories

The `queryRepos` function accepts a list of `Repo` objects and a `QueryFilter`, and returns a `QueryResult`.

## Filter options

| Option       | Type       | Description                                      |
| ------------ | ---------- | ------------------------------------------------ |
| `name`       | `string`   | Partial name match (case-insensitive)            |
| `topics`     | `string[]` | All listed topics must be present                |
| `language`   | `string`   | Exact language match (case-insensitive)          |
| `activeOnly` | `boolean`  | When `true`, archived repos are excluded         |
| `minStars`   | `number`   | Repos must have at least this many stars         |

## Examples

### Filter by language

```typescript
const pythonRepos = queryRepos(repos, { language: "Python" });
```

### Filter active repos by topic

```typescript
const activeGovUK = queryRepos(repos, {
  topics: ["govuk"],
  activeOnly: true,
});
```

### Combine multiple filters

```typescript
const result = queryRepos(repos, {
  language: "TypeScript",
  topics: ["api"],
  minStars: 100,
  activeOnly: true,
});
```

## Grouping by language

```typescript
import { groupByLanguage } from "uk-x-gov-repo-query";

const groups = groupByLanguage(repos);
// { javascript: [...], python: [...], unknown: [...] }
```
