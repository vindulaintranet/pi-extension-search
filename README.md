# pi-extension-search

A public-ready [Pi](https://github.com/badlogic/pi-mono) package that adds two web search tools:

- `exa_search`
- `brave_search`

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

## Validation

Recommended checks:

```bash
npm pack --dry-run
npx -y esbuild search.ts --bundle --platform=node --format=cjs --outfile=/tmp/pi-extension-search-check.js --external:@mariozechner/pi-coding-agent --external:@sinclair/typebox
```

## License

MIT
