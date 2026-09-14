<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

<br />
<br />

# LongLink Compute package

The chart installs Knative, Kourier, CloudNativePG, and RustFS. The Platform
validates it and manages tenant resources; it never installs shared infrastructure.

`chart/` packages every shared controller manifest. `templates/90-release.yaml`
defines the Platform compatibility contract.

Tagged Platform releases publish this package with the matching API image. The
nightly workflow publishes an immutable prerelease containing a Compute archive,
checksum, and API image digest from one commit. Hosting environments use that
metadata to apply matching nightly Platform and Compute builds.

## Kubernetes setup and updates

The hosting environment owns cluster access, storage, fixed LoadBalancer addresses,
deployment, and recovery. Install this chart before registering the Compute with the
Platform API. The API validates the shared infrastructure and creates Organization
resources only in a registered Compute.

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

Register `https://<gateway-ip>` and `https://<storage-ip>` with their corresponding
`tls.crt` values. Never delete or recreate RustFS or PostgreSQL to transfer
ownership. Existing Helmfile-managed installations require a reviewed ownership
migration; the chart never adopts existing resources automatically. Stop Platform
workers, back up the shared resources, and run the first chart upgrade manually
with Helm's `--take-ownership` only after reviewing the affected resources. Existing
Compute registrations must be recreated with the fixed URLs and certificates before
they have Organizations; the current API intentionally has no in-place endpoint
mutation contract.

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
