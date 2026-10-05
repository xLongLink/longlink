# Vendored Sources

The adjacent Kubernetes manifests and local chart dependency are pinned below
so a Compute chart can be installed with Helm alone.

- Knative Serving CRDs `v1.23.0`
- Knative Serving `v1.23.0`
- Knative Kourier `v1.23.0`
- CloudNativePG chart `0.28.1` from `https://cloudnative-pg.github.io/charts`, with
  the historic `cnpg` selector instance retained for in-place upgrades
- CloudNativePG controller `1.29.1`, pinned in the parent chart values to the
  multi-architecture index `sha256:0dfff19ba7b52ca25851a1010028b6940fff2e233290465af1cfb08a5f3f4661`
  resolved from `ghcr.io/cloudnative-pg/cloudnative-pg:1.29.1`. The index reports
  version `1.29.1`, source revision `a4060c152`, and Linux amd64/arm64 images.
- RustFS image `1.0.0`
- Nginx storage TLS proxy `1.29.1-alpine`, pinned in the chart values to the
  multi-architecture index `sha256:42a516af16b852e33b7682d5ef8acbd5d13fe08fecadc7ed98605ba5e3b26ab8`
  resolved from the Docker Official Image `docker.io/library/nginx:1.29.1-alpine`.
  The index reports version `1.29.1-alpine`, source revision
  `5a4ad48c733b365d69a4d1c9946a9d8480469c7f`, and Linux amd64/arm64 images.

Refresh these sources only with a reviewed dependency update.
