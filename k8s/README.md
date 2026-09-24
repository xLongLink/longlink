<div align="center">

<img src="../banner.png" alt="LongLink banner" />

</div>

## LongLink Compute package

The chart installs Knative, Kourier, CloudNativePG, and RustFS. The Platform
validates its matching release version and manages tenant resources; it never installs
shared infrastructure.

<br />

## Architecture

Scope: Operator installs and operates shared Compute infrastructure.

```text
Compute cluster
├── cnpg-system
│   └── CloudNativePG controller
├── knative-serving
│   ├── Knative Serving controller, webhook, and activator
│   └── Kourier network controller
    ├── kourier-system
    │   └── Kourier gateway
    ├── longlink-system
    │   ├── Helm release: longlink-compute
    │   └── Compute release contract
└── rustfs
    ├── RustFS
    └── TLS storage proxy
```

<br />

## Requirements

The chart creates the RustFS namespace and administrator Secret
(`rustfs/longlink-rustfs`). Compute registration reads those credentials
through the provided kubeconfig, so they never leave the cluster. The chart
generates strong random credentials on first install and keeps them across
upgrades and uninstalls.

Set `gatewayAllowedSourceCidr` to the trusted Platform API egress CIDR, not a
general user or cluster network. The gateway LoadBalancer enforces this range;
its pod NetworkPolicy cannot reliably filter the original source IP after the
load balancer or CNI translates it. Direct gateway access from an allowed
source bypasses the Platform's Solution authorization checks. The local k3d
configuration uses its cluster subnet for development only; do not reuse that
setting for a shared Compute cluster.

Solution workloads always reach object storage through the cluster-local proxy at `https://longlink-storage.rustfs.svc:443`. The registered storage endpoint is the Platform controller endpoint used from outside the cluster.

<br />

## Setup

Install the shared Compute infrastructure from source:

```bash
helm upgrade --install longlink-compute k8s/chart \
  --namespace <release-namespace> \
  --create-namespace \
  --set gateway.address=<gateway-address> \
  --set storage.address=<storage-address> \
  --set gatewayAllowedSourceCidr=<gateway-allowed-source-cidr>
```

Install from a release image instead, which embeds its matching chart at
`app/compute/`:

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

<br />

## Update

> [!WARNING]
> RustFS now runs as a StatefulSet with fixed selectors. Kubernetes cannot
> change workload kinds or selectors in place. Before upgrading an older
> Compute package, plan a RustFS data migration and replace the workload during
> a maintenance window. The chart does not move data or delete retained legacy
> data and log volumes.

Update the gateway source allowlist while preserving the installed values:

```bash
helm upgrade longlink-compute k8s/chart \
  --namespace <release-namespace> \
  --reuse-values \
  --set gatewayAllowedSourceCidr=<gateway-allowed-source-cidr>
```

<br />

## Cleanup

Remove the Compute Helm release:

```bash
helm uninstall longlink-compute --namespace <release-namespace>
```

<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
