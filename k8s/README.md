<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

<br />
<br />

# LongLink Compute package

The package installs Knative, Kourier, CloudNativePG, Rook, and Ceph. The Platform
validates it and manages tenant resources; it never installs shared infrastructure.

`setup.yaml.gotmpl` defines package releases. `release/release.yml` defines the
package version and Platform compatibility contract.

## Local

Requirements: Linux AMD64, Docker, k3d, kubectl, OpenSSL, curl, uv, and Vite+.
`make up` uses the pinned Helmfile container when Helmfile is not installed locally.

```bash
make install
make up
make api
make web
make image
make seed
```

Stop Platform workers before changing infrastructure. Run `make up` to reapply it.
Run `make down` only for disposable local data.

## Hosted

The hosting environment owns cluster access, storage, TLS, deployment, and recovery.
Create the gateway and storage TLS Secrets, stop Platform workers, then apply the
boundaries before Helmfile installs shared controllers:

```bash
kubectl apply --server-side --field-manager=longlink-compute -k k8s/boundaries
helmfile --file k8s/setup.yaml.gotmpl \
  --state-values-set infrastructure=/absolute/path/to/storage-overlay sync
```

Never delete or recreate Ceph or PostgreSQL to transfer ownership. Existing
kubectl-managed installations require a reviewed migration.

<br />
<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
