<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)
</div>

## LongLink Platform API

The LongLink Platform API manages authentication, organizations, infrastructure,
and Solution deployments.

<br />

## Architecture

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

- PostgreSQL, MySQL, or SQLite for Platform metadata. Organization and Solution data requires PostgreSQL.
- A Kubernetes Compute with Linux AMD64 nodes for Solution runtimes and migration Jobs.
- Publicly accessible `linux/amd64` Solution images on GHCR.

See the [Compute package guide](../k8s/README.md) for Compute installation.


<br />

## Release

TODO

<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
