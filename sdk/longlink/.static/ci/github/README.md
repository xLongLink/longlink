# GitHub CI

This folder adds GitHub Actions workflows when the app is created with GitHub CI support:

```bash
uvx longlink init --folder <folder-name> --ci github
```

## Tests

Tests run on pull requests and pushes to `main`:

```bash
uv run pytest
```

## Release

The release workflow runs when a GitHub release is published. It builds the LongLink image with the release tag.

Create and publish a release tag:

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes "Release v0.1.0"
```
