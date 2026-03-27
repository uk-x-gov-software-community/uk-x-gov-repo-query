# uk-x-gov-repo-query

> An experiment to build a query tool on top of [x-gov-opensource-repo-scraper](https://github.com/uk-x-gov-software-community/x-gov-opensource-repo-scraper).

[![CI](https://github.com/uk-x-gov-software-community/uk-x-gov-repo-query/actions/workflows/ci.yml/badge.svg)](https://github.com/uk-x-gov-software-community/uk-x-gov-repo-query/actions/workflows/ci.yml)
[![Docs](https://github.com/uk-x-gov-software-community/uk-x-gov-repo-query/actions/workflows/docs.yml/badge.svg)](https://uk-x-gov-software-community.github.io/uk-x-gov-repo-query/)

## Features

- **Zero runtime dependencies** – pure TypeScript
- **Flexible filtering** – name, topics, language, stars, archived status
- **esbuild** for fast, minimal builds
- **Vitest** for unit testing
- **Biome** for linting and formatting
- **VitePress** docs deployed to GitHub Pages

## Quick start

```bash
npm install
npm test          # run tests
npm run build     # compile with esbuild
npm run lint      # check code style
npm run lint:fix  # auto-fix issues
npm run docs:dev  # local docs preview
```

## Documentation

Full docs at <https://uk-x-gov-software-community.github.io/uk-x-gov-repo-query/>

## Licence

[MIT](LICENSE)
