# Contributing

Thanks for contributing to `pi-extension-search`.

## What this repository contains

This repository ships a small Pi package with one extension:

- `search.ts`

It registers:
- `exa_search`
- `brave_search`

## Local setup

```bash
npm install
npm run validate
```

## Test commands

```bash
npm test
npm run check:bundle
npm run check:pack
npm run validate
```

What these checks cover:
- unit tests for settings/env loading and provider adapters
- bundle/syntax validation for the Pi extension entrypoint
- package validation with `npm pack --dry-run`

## Making a change

1. Create a branch from `main`
2. Make the change
3. Update docs if behavior changed:
   - `README.md`
   - `CHANGELOG.md`
   - `RELEASING.md` when release flow changes
4. Run:
   ```bash
   npm run validate
   ```
5. Open a pull request

## Pull requests

A good PR should include:
- what changed
- why it changed
- how it was tested
- any API key, installation, or release implications

## Maintainer merge flow

For maintainers, the normal flow is:

1. Review PR
2. Ensure CI is green
3. Squash merge or merge commit into `main`
4. If the change should be published, follow `RELEASING.md`

## How Pi users get updates

There are two common install modes.

### Unpinned git install

```bash
pi install git:github.com/vindulaintranet/pi-extension-search
```

In this case, users can later run:

```bash
pi update
```

Pi will pull the latest default branch state for the package.

### Pinned git install

```bash
pi install git:github.com/vindulaintranet/pi-extension-search@v0.1.0
```

Pinned installs are intentionally stable. `pi update` skips them until the user decides to move to another tag/ref.

## Questions and proposals

If you want to propose a new search provider or change the tool contract, open an issue or PR before expanding the surface area.
