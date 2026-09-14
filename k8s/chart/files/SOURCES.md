# Vendored Sources

The adjacent Kubernetes manifests are rendered from the pinned sources below so a
Compute chart can be installed with Helm alone.

- Knative Serving CRDs `v1.23.0`
- Knative Serving `v1.23.0`
- Knative Kourier `v1.23.0`
- CloudNativePG chart `0.28.1`, rendered with `fullnameOverride=cnpg-controller-manager`

Refresh these files only with a reviewed dependency update. The RustFS chart is
vendored separately under `charts/` and pinned in `Chart.lock`.
