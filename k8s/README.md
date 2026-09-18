<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

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
through the provided kubeconfig, so they never leave the cluster. Leave
`rustfs.secret.accessKey`/`secretKey` empty to generate strong random
credentials on first install; set them to bring your own keys. Generated
credentials are kept across upgrades and uninstalls.

Solution workloads always reach object storage through the cluster-local proxy at `https://longlink-storage.rustfs.svc:443`. The registered storage endpoint is the Platform controller endpoint used from outside the cluster.

<br />

## Setup

Install the shared Compute infrastructure:

```bash
helm upgrade --install longlink-compute k8s/chart \
  --namespace <release-namespace> \
  --create-namespace \
  --set gateway.address=<gateway-address> \
  --set storage.address=<storage-address> \
  --set gatewayAllowedSourceCidr=<gateway-allowed-source-cidr>
```

<br />

## Update

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
