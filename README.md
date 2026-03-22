# pi-extension-search

[![CI](https://github.com/vindulaintranet/pi-extension-search/actions/workflows/ci.yml/badge.svg)](https://github.com/vindulaintranet/pi-extension-search/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/vindulaintranet/pi-extension-search)](https://github.com/vindulaintranet/pi-extension-search/releases)

A public-ready [Pi](https://github.com/badlogic/pi-mono) package that adds two web search tools:

- `exa_search`
- `brave_search`

Created by [Fabio Rizzo Matos](https://github.com/fabiorizzomatos) · contact: `fabiorizzo@vindula.com.br`

## What it does

This package registers search tools for Pi so the agent can fetch current web results directly from:

- [Exa](https://exa.ai/)
- [Brave Search](https://brave.com/search/api/)

It also supports loading API keys from Pi settings, not only from shell environment variables.

## Install

### From GitHub

```bash
pi install git:github.com/vindulaintranet/pi-extension-search
```

### Pin to a release tag

```bash
pi install git:github.com/vindulaintranet/pi-extension-search@v0.1.0
```

### From a local path

```bash
pi install /absolute/path/to/pi-extension-search
```

After installing, restart Pi or run:

```text
/reload
```

## Tools

### `exa_search`

Search the web with Exa.

Parameters:
- `query`
- `numResults`
- `searchType`
- `includeDomains`
- `excludeDomains`
- `useAutoprompt`

### `brave_search`

Search the web with Brave Search.

Parameters:
- `query`
- `count`
- `searchLang`
- `country`
- `safeSearch`

## API keys

You can provide keys in either way below.

### Option 1: shell environment

```bash
export EXA_API_KEY=your_exa_key
export BRAVE_API_KEY=your_brave_key
```

### Option 2: Pi settings.json

Project-local file: `<project>/.pi/settings.json`

```json
{
  "env": {
    "EXA_API_KEY": "your_exa_key",
    "BRAVE_API_KEY": "your_brave_key"
  }
}
```

Global file: `~/.pi/agent/settings.json`

```json
{
  "env": {
    "EXA_API_KEY": "your_exa_key",
    "BRAVE_API_KEY": "your_brave_key"
  }
}
```

The extension checks the current shell first, then project Pi settings, then global Pi settings.

## Quality checks

Run everything locally with:

```bash
npm install
npm run validate
```

This runs:
- unit tests for the core search helpers
- bundle validation for the Pi extension entrypoint
- `npm pack --dry-run` to validate package contents

## Contributions

If you want to contribute:

1. fork the repository
2. create a branch
3. run `npm run validate`
4. open a pull request

See:
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [RELEASING.md](./RELEASING.md)

## How updates reach Pi users

### Users installed from the default branch

```bash
pi install git:github.com/vindulaintranet/pi-extension-search
```

They can later run:

```bash
pi update
```

and Pi will pull the latest package state from the default branch.

### Users installed from a pinned tag

```bash
pi install git:github.com/vindulaintranet/pi-extension-search@v0.1.0
```

Pinned installs do not move automatically on `pi update`. They stay on that exact ref until the user upgrades intentionally.

## Package manifest

This repository is a Pi package via `package.json`:

```json
{
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./search.ts"]
  }
}
```

## License

MIT
