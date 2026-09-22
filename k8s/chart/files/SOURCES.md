# Vendored Sources

The adjacent Kubernetes manifests and local chart dependency are pinned below
so a Compute chart can be installed with Helm alone.

- Knative Serving CRDs `v1.23.0`
- Knative Serving `v1.23.0`
- Knative Kourier `v1.23.0`
- CloudNativePG chart `0.28.1` from `https://cloudnative-pg.github.io/charts`, with
  the historic `cnpg` selector instance retained for in-place upgrades
- RustFS image `1.0.0-rc.6`

Refresh these sources only with a reviewed dependency update.
