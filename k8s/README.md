<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

## LongLink Compute package

The chart installs Knative, Kourier, CloudNativePG, and RustFS. The Platform
validates it and manages tenant resources; it never installs shared infrastructure.

<br />

## Architecture

Scope: Operator installs and operates shared Compute infrastructure.

```text
Operator
└── Compute cluster
    ├── cnpg-system
    │   └── CloudNativePG controller
    ├── knative-serving
    │   ├── Knative Serving controller, webhook, and activator
    │   └── Kourier network controller
    ├── kourier-system
    │   └── Kourier gateway
    ├── longlink-system
    │   └── Compute release contract
    └── rustfs
        ├── RustFS
        └── TLS storage proxy
```

Scope: Platform API validates Compute and manages Organization resources.

```text
Platform API
└── Registered Compute
    └── Organization
        ├── Compute namespace
        │   └── Solution
        │       ├── Knative Service and migration Jobs
        │       └── Solution Secrets
        ├── Database namespace
        │   └── CloudNativePG cluster
        │       └── Shared identity schema and Solution schemas
        └── RustFS bucket
            ├── Shared storage prefix
            └── Solution storage prefixes
```

<br />

## Requirements

- Helm and cluster administrator access.
- One fixed LoadBalancer address for the gateway and one for storage.
- The `rustfs/longlink-rustfs` Secret with `RUSTFS_ACCESS_KEY` and
  `RUSTFS_SECRET_KEY`. The chart references this Secret without storing
  credentials in Helm release state.


<br />

## Kubernetes setup and updates


Reserve one address for the gateway and one for storage before installation. Create
the `rustfs/longlink-rustfs` Secret with `RUSTFS_ACCESS_KEY` and
`RUSTFS_SECRET_KEY`; the chart references it without storing credentials in Helm
release state. The chart creates and preserves self-signed IP-SAN TLS Secrets for
the two fixed addresses:

```bash
helm upgrade --install longlink-compute k8s/chart \
  --namespace rustfs \
  --create-namespace \
  --set gateway.address=203.0.113.10 \
  --set storage.address=203.0.113.11 \
  --set runtimeEgressCidr=203.0.113.0/24 \
  --wait \
  --timeout 15m
```

<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
