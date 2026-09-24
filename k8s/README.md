# LongLink Compute

This Helm chart installs shared Knative, Kourier, CloudNativePG, and RustFS infrastructure.
Install it before registering a Compute in the Platform. Registration requires a
kubeconfig with cluster access and the gateway and storage addresses.

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

Or from a release image:

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
