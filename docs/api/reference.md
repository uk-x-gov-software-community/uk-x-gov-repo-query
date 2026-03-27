# API Reference

## `queryRepos`

```typescript
function queryRepos(repos: Repo[], filter: QueryFilter): QueryResult
```

Filters a list of repos according to the supplied criteria. All criteria are combined with logical AND; omitting a criterion means "match anything".

---

## `sortByStars`

```typescript
function sortByStars(repos: Repo[]): Repo[]
```

Returns a new array of repos sorted by star count in descending order. The original array is not mutated.

---

## `groupByLanguage`

```typescript
function groupByLanguage(repos: Repo[]): Record<string, Repo[]>
```

Groups repos by programming language (lowercase key). Repos with no language are grouped under `"unknown"`.

---

## Types

### `Repo`

| Field          | Type              | Description                        |
| -------------- | ----------------- | ---------------------------------- |
| `name`         | `string`          | Repository name                    |
| `owner`        | `string`          | Organisation or user login         |
| `description`  | `string`          | Short description                  |
| `topics`       | `string[]`        | GitHub topics                      |
| `language`     | `string \| null`  | Primary programming language       |
| `stars`        | `number`          | Star count                         |
| `forks`        | `number`          | Fork count                         |
| `isArchived`   | `boolean`         | Whether the repo is archived       |
| `lastPushedAt` | `string`          | ISO 8601 timestamp of last push    |
| `url`          | `string`          | Full GitHub URL                    |

### `QueryFilter`

| Field        | Type       | Description                                    |
| ------------ | ---------- | ---------------------------------------------- |
| `name`       | `string?`  | Partial name match (case-insensitive)          |
| `topics`     | `string[]?`| All listed topics must be present              |
| `language`   | `string?`  | Exact language match (case-insensitive)        |
| `activeOnly` | `boolean?` | When `true`, archived repos are excluded       |
| `minStars`   | `number?`  | Minimum star count                             |

### `QueryResult`

| Field   | Type     | Description               |
| ------- | -------- | ------------------------- |
| `total` | `number` | Number of matched repos   |
| `repos` | `Repo[]` | The matched repos         |
