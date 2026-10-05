# Vendored Sources

The adjacent Kubernetes manifests and local chart dependency are pinned below
so a Compute chart can be installed with Helm alone.

- Knative Serving CRDs `v1.23.0`
- Knative Serving `v1.23.0`
- Knative Kourier `v1.23.0`
- CloudNativePG chart `0.28.1` from `https://cloudnative-pg.github.io/charts`, with
  the historic `cnpg` selector instance retained for in-place upgrades
- RustFS image `1.0.0`
- Nginx storage TLS proxy `1.29.1-alpine`, pinned in the chart values to the
  multi-architecture index `sha256:42a516af16b852e33b7682d5ef8acbd5d13fe08fecadc7ed98605ba5e3b26ab8`
  resolved from the Docker Official Image `docker.io/library/nginx:1.29.1-alpine`.
  The index reports version `1.29.1-alpine`, source revision
  `5a4ad48c733b365d69a4d1c9946a9d8480469c7f`, and Linux amd64/arm64 images.

Refresh these sources only with a reviewed dependency update.
