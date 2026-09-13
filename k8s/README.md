# LongLink Compute package

The package installs Knative, Kourier, CloudNativePG, Rook, and Ceph. The Platform
validates it and manages tenant resources; it never installs shared infrastructure.

`setup.yaml.gotmpl` defines package releases. `release/release.yml` defines the
package version and Platform compatibility contract.

## Local

Requirements: Linux AMD64, Docker, k3d, kubectl, Helm, Helmfile, Kustomize,
OpenSSL, curl, uv, and Vite+.

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

The hosting environment owns cluster access, storage, TLS, deployment, and rollback.
Create the gateway and storage TLS Secrets, stop Platform workers, then run:

```bash
kubectl apply --server-side --field-manager=longlink-compute -k k8s/boundaries
helmfile --file k8s/setup.yaml.gotmpl \
  --state-values-set infrastructure=/absolute/path/to/storage-overlay sync
```

Never delete or recreate Ceph or PostgreSQL to transfer ownership. Existing
kubectl-managed installations require a reviewed migration.
