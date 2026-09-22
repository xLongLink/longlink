<div align="center">


# Solution Template

Build a process-specific business application. \
All the data, logic and configurations are defined as code. \
Use your favorite AI tool with full context on the solution.

</div>

<br />

## Getting Started

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) to get started

```bash
uv sync
uv run longlink migrate
uv run longlink dev
```

<br />

## Migrate changes

```bash
uv run longlink migrate
```

<br />

## Release

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --generate-notes
```

<br />

---

<div align="center">
LongLink 2026

</div>

---
