# Public pi-extension-search repository

## Goal
Create a dedicated public-ready repository for the Pi search extension under `vindulaintranet/pi-extension-search`.

## Context
The original implementation lived inside `vindulautils` at `projects/pi-extensions/search.ts` together with other Pi extensions. The goal here was to extract only the search extension into its own repository so it can be published independently and installed directly with `pi install git:...`.

## Decisions
- Created a dedicated package repository instead of keeping the extension as a subdirectory of a larger monorepo.
- Kept the package focused on a single extension: `search.ts`.
- Made the package public-ready by adding:
  - `package.json` with Pi manifest
  - `README.md`
  - `CHANGELOG.md`
  - `LICENSE`
  - `.gitignore`
- Used `files` in `package.json` so the package stays small and predictable.
- Kept API key loading support from both shell env and Pi `settings.json`.

## Commands run
- `npm pack --dry-run`
- `npx -y esbuild search.ts --bundle --platform=node --format=cjs --outfile=/tmp/pi-extension-search-check.js --external:@mariozechner/pi-coding-agent --external:@sinclair/typebox`
- `git init -b main`
- `gh repo create vindulaintranet/pi-extension-search --public --source=. --remote=origin --push`

## Files changed
- `package.json`
- `search.ts`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `.gitignore`
- `docs/agent/notes/2026-03-22-public-pi-extension-search-repo.md`

## Tests
- `npm pack --dry-run`
- `esbuild` bundle syntax check for `search.ts`

## Risks
- Public visibility means API providers and package behavior are now discoverable; secrets must remain only in user-local env/settings.
- The package is git-install ready, but npm publishing was not configured in this step.

## Next
- Optionally add GitHub topics, description, and social preview.
- Optionally publish to npm later if distribution via `pi install npm:...` becomes useful.
