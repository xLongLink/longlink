<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

<br />
<br />

# LongLink Compute package

The package installs Knative, Kourier, CloudNativePG, and RustFS. The Platform
validates it and manages tenant resources; it never installs shared infrastructure.

`setup.yaml.gotmpl` defines package releases. `release/release.yml` defines the
Platform compatibility contract.

## Kubernetes setup and updates

The hosting environment owns cluster access, storage, TLS, deployment, and recovery.
Install this package before registering the Compute with the Platform API. The API
validates the shared infrastructure and creates Organization resources only in a
registered Compute.

Create the gateway and storage TLS Secrets plus the `rustfs/longlink-rustfs` Secret
with `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY`. Stop Platform workers before a
package installation or update, then apply the boundaries before Helmfile installs
or reconciles shared controllers:

```bash
kubectl apply --server-side --field-manager=longlink-compute -k k8s/boundaries
helmfile --file k8s/setup.yaml.gotmpl \
  --state-values-set infrastructure=/absolute/path/to/storage-overlay sync
```

Never delete or recreate RustFS or PostgreSQL to transfer ownership. Existing
kubectl-managed installations require a reviewed migration.

For workstation-only infrastructure and development commands, see
[`dev/README.md`](../dev/README.md).

<br />
<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
