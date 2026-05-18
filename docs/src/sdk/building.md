# Building

- Applications can be built using Docker.
- `longlink build` generates the `Dockerfile` and the `manifest.json`.
- Once containerized, applications can be pushed to any registry.
- Applications can be connected to the control plane and deployed.

::: code-group

```bash [uv]
uv run longlink build
```

```bash [pip]
longlink build
```

:::
