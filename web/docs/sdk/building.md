---
lastUpdated: 2026-05-25
editUrl: https://github.com/xLongLink/longlink/edit/main/web/docs/sdk/building.md
---

# Building

- Applications can be built using Docker.
- `longlink build` generates the `Dockerfile` and the `manifest.json`.
- Once containerized, applications can be pushed to any registry.
- Applications can be connected to the control plane and deployed.

::: tabs

== pip

```bash
longlink build
```

== uv

```bash
uv run longlink build
```

:::
