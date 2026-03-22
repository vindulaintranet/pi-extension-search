# Public pi-extension-search repository

## Goal
Create and harden a dedicated public-ready repository for the Pi search extension under `vindulaintranet/pi-extension-search`.

## Context
The original implementation lived inside `vindulautils` at `projects/pi-extensions/search.ts` together with other Pi extensions. The goal here was to extract only the search extension into its own repository so it can be published independently, installed directly with `pi install git:...`, and maintained with a clear contribution and release flow.

## Decisions
- Created a dedicated package repository instead of keeping the extension as a subdirectory of a larger monorepo.
- Kept the package focused on a single extension: `search.ts`.
- Split reusable logic into `search-core.ts` so tests can validate behavior without depending on Pi runtime imports.
- Made the package public-ready by adding:
  - `package.json` with Pi manifest and author metadata
  - `README.md` with install/update guidance
  - `CHANGELOG.md`
  - `LICENSE`
  - `.gitignore`
  - GitHub Actions CI workflow
  - GitHub Actions release workflow
- Updated GitHub Actions workflow actions to current majors (`actions/checkout@v6`, `actions/setup-node@v6`) after the first release run surfaced a Node 20 deprecation warning.
  - `CONTRIBUTING.md`
  - `RELEASING.md`
  - PR template
  - automated tests
- Used `files` in `package.json` so the package stays small and predictable.
- Kept API key loading support from both shell env and Pi `settings.json`.
- Added attribution to Fabio Rizzo Matos in package metadata, README, and source headers.
- Verified the public GitHub profile `https://github.com/fabiorizzomatos` is public, but the profile email field is `null` and public code search returned `0` matches for `fabiorizzo@vindula.com.br`. The email was therefore added from explicit user input, not from public profile metadata.

## Commands run
- `git init -b main`
- `gh repo create vindulaintranet/pi-extension-search --public --source=. --remote=origin --push`
- `gh api -X PUT repos/vindulaintranet/pi-extension-search/topics -H 'Accept: application/vnd.github+json' -f names[]='pi-package' -f names[]='pi-extension' -f names[]='search' -f names[]='exa' -f names[]='brave-search'`
- `npm install`
- `npm test`
- `npm run validate`
- `npm pack --dry-run`
- `gh api users/fabiorizzomatos --jq '{html_url,email,name,blog}'`
- `gh api 'search/code?q=fabiorizzo@vindula.com.br+user:fabiorizzomatos&per_page=10' --jq '{total_count}'`

## Files changed
- `package.json`
- `package-lock.json`
- `search.ts`
- `search-core.ts`
- `test/search.test.ts`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `.gitignore`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `CONTRIBUTING.md`
- `RELEASING.md`
- `docs/agent/notes/2026-03-22-public-pi-extension-search-repo.md`

## Tests
- `npm test`: OK
  - 6 tests passing
  - covers project/global Pi settings env loading, env override behavior, output formatting/truncation, Exa request adapter, Brave request adapter
- `npm run validate`: OK
  - tests pass
  - bundle check passes via `esbuild`
  - package check passes via `npm pack --dry-run`
- package tarball remains lean after hardening:
  - ~6.5 kB tarball
  - ~19.6 kB unpacked

## Risks
- Public visibility means API providers and package behavior are now discoverable; secrets must remain only in user-local env/settings.
- Users who install from an unpinned git ref get fast updates with `pi update`, which is convenient but less stable.
- Users who install from pinned tags are stable, but will not move automatically until they choose a new tag.

## Next
- Create the first tagged GitHub release (recommended: `v0.1.0`) now that CI, tests, docs, and release workflow are in place.
- Optionally publish to npm later if distribution via `pi install npm:...` becomes useful.
- Optionally add issue templates and a security policy if the public contribution volume increases.
