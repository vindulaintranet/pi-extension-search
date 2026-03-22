# Releasing

This repository supports both:
- unpinned installs from the default branch
- pinned installs from tags such as `@v0.1.0`

## Release checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full validation:

```bash
npm install
npm run validate
```

4. Commit the release changes:

```bash
git add .
git commit -m "chore: release v0.1.0"
```

5. Create and push the release tag:

```bash
git tag v0.1.0
git push origin main --tags
```

## What happens after the tag

The GitHub Actions release workflow:
- installs dependencies
- runs `npm run validate`
- creates the package tarball
- creates a GitHub Release for the tag
- attaches the `.tgz` artifact to the release

## How Pi updates work

### Users on default branch installs

If a user installed with:

```bash
pi install git:github.com/vindulaintranet/pi-extension-search
```

then later runs:

```bash
pi update
```

Pi updates that package to the newest default-branch state.

### Users on pinned tags

If a user installed with:

```bash
pi install git:github.com/vindulaintranet/pi-extension-search@v0.1.0
```

then `pi update` does not move them automatically. That install is pinned.

To adopt a newer release, the user needs to install or update to a newer tag/ref explicitly.

## Recommendation

- Use unpinned installs for fast-moving internal usage
- Use pinned tags for stable/shared setups
- Cut a new tag whenever behavior, docs, or compatibility changes in a way users may want to consume intentionally
