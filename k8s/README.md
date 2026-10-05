# LongLink Compute

This Helm chart installs shared Knative, Kourier, CloudNativePG, and RustFS infrastructure.
Install it before registering a Compute in the Platform. Registration requires a
kubeconfig with cluster access and the gateway and storage addresses.

The CloudNativePG controller is pinned to a multi-architecture SHA-256 digest in
the chart values. Helm rendering rejects tag-only or malformed image overrides.
Controller updates must include a reviewed digest in `cloudnative-pg.image.tag`
(`version@sha256:<64 lowercase hexadecimal characters>`); the same pinned image
is used for `OPERATOR_IMAGE_NAME`.

## Install

From source:

```bash
helm upgrade --install longlink-compute k8s/chart \
  --namespace <release-namespace> \
  --create-namespace \
  --set gateway.address=<gateway-address> \
  --set storage.address=<storage-address> \
  --set gatewayAllowedSourceCidr=<gateway-allowed-source-cidr>
```

Or from a release image (the chart is embedded in the API image):

```bash
version=<release-version>
crane export --platform linux/amd64 "ghcr.io/xlonglink/longlink:${version}" - \
  | tar -xO "app/compute/longlink-${version#v}.tgz" > longlink-chart.tgz
helm upgrade --install longlink-compute longlink-chart.tgz \
  --namespace <release-namespace> \
  --create-namespace \
  --set gateway.address=<gateway-address> \
  --set storage.address=<storage-address> \
  --set gatewayAllowedSourceCidr=<gateway-allowed-source-cidr>
```

### Beta releases

Push a tag such as `v0.5.0-beta.1` on a commit already in the default branch.
The [beta workflow](../.github/workflows/beta.yml) runs the tests, packages the
Compute chart as version `0.5.0-beta.1`, and publishes it to
`oci://ghcr.io/xlonglink/longlink` alongside the API image
`ghcr.io/xlonglink/longlink:v0.5.0-beta.1`. It then creates a GitHub
**pre-release** for that tag. The image embeds the same chart and records its
version and SHA-256 in the `longlink.dev/release-compute-*` labels. Beta
publication does not update the `latest` image tag, publish the SDK to PyPI,
or sync the sample repository.

Creating or marking a GitHub pre-release alone does not publish either GHCR
artifact or deploy it. Push the tag to trigger the workflow; use a new beta
number for each revision instead of moving a published tag. To install a beta
chart directly:

```bash
helm upgrade --install longlink-compute oci://ghcr.io/xlonglink/longlink \
  --version 0.5.0-beta.1 \
  --namespace <release-namespace> \
  --create-namespace \
  --set gateway.address=<gateway-address> \
  --set storage.address=<storage-address> \
  --set gatewayAllowedSourceCidr=<gateway-allowed-source-cidr>
```

For the managed deployment in [LinkLong](https://github.com/xLongLink/linklong),
open a PR pinning the beta chart version in `infra/compute.tf` and the matching
API **image digest** in `infra/platform.tf` for nightly (the `beta.longlink.dev`
environment). Review the Terraform plan, coordinate the Compute and Platform
rollouts, then test the deployment. Promote exactly the tested chart version
and API image digest to production in a separate reviewed change.

If a clean stable version is required instead, publish new stable artifacts
from the tested commit and verify them before deploying: changing the GitHub
pre-release flag does not rename an OCI chart or preserve an image digest.
The [stable release workflow](../.github/workflows/release.yml) also publishes
its Compute chart to GHCR alongside the stable API image.

## Update

> [!WARNING]
> Upgrading an older installation to the RustFS StatefulSet requires a planned
> data migration and maintenance window. Kubernetes cannot convert the old
> workload in place; the chart does not migrate or delete its data.

To change the gateway source allowlist without replacing other installed values:

```bash
helm upgrade longlink-compute k8s/chart \
  --namespace <release-namespace> \
  --reuse-values \
  --set gatewayAllowedSourceCidr=<gateway-allowed-source-cidr>
```

## Uninstall

```bash
helm uninstall longlink-compute --namespace <release-namespace>
```
