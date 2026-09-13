# LongLink Compute package

The Compute package is a set of pinned Kubernetes manifests. It installs Knative,
Kourier, CloudNativePG, Rook, and Ceph independently of the Platform API. The
Platform validates an installed package and manages tenant resources; it never
installs or upgrades shared infrastructure.

```text
longlink/
├── k8s/ → shared infrastructure package
│   ├── boundaries/ → shared namespaces and ingress policies
│   ├── operators/ → vendored upstream manifests and Kustomize customizations
│   ├── infrastructure/ → shared Ceph resources and health identity
│   └── release/ → package version and Platform compatibility contract
└── dev/ → local setup and connectivity outside the API
    ├── setup.py → configuration, backing driver, and S3 certificate
    ├── compose.yml → registry, SMTP capture, and loopback endpoint connections
    └── compute/ → backing manifests, split DNS, Service, and storage overlays
```

## Local installation

Requirements: Linux AMD64, Docker, k3d, kubectl **v1.35.4** with Kustomize,
OpenSSL, `flock`, uv, and the existing Vite+ development tooling.

```bash
make install
make up
# Separate terminals:
make api
make web
# After the API is ready:
make seed
```

`make up` creates the local cluster, registry, CSI hostpath backing provisioner,
and TLS Secrets, then runs `make compute`. The target applies the Kustomize stages
in dependency order, waits for local controllers and storage, and applies
`release/release.yml` last. `make connect` then starts dev-owned gateway/S3
connections. The API runs directly on the host with ordinary HTTPS clients; local
CoreDNS makes the same S3 origin reachable by Solution Pods. See
[`dev/README.md`](../dev/README.md) for the complete connectivity contract.

To change or retry local infrastructure:

1. Stop `make api` and any independently started Platform workers.
2. Edit the package or `dev/compute/` overlays.
3. Run `make compute`.
4. Restart `make api` to validate the installation.
5. Run `make seed` if tenant provisioning needs another attempt.

`make compute` takes an exclusive `dev/compute.lock`; `make api` holds a shared
lock for its worker lifetime. The local workflow never deletes tenant namespaces,
database PVCs, buckets, or credentials. `make down` removes the complete local
cluster.

## Configuration

Environment overlays reference and patch individual package stages. The local
infrastructure overlay selects one 20 GiB OSD using `longlink-development`; the
shared base uses an illustrative `block-storage` StorageClass. Hosted environments
must supply overlays for their actual durable Block and filesystem provisioner.

Registration storage class, instance count, and per-OSD size describe the installed
topology and must match its overlay. Database defaults and tenant bucket policy
remain Platform-owned. Storage resizing is not supported by this release.

Render a stage without accessing a cluster:

```bash
kubectl kustomize k8s/infrastructure
kubectl kustomize dev/compute/infrastructure
```

## Hosted deployment

The hosting repository owns deployment coordination, retries, upgrades, and
rollback. It must supply the Kubernetes cluster, metrics service, storage
provisioner, endpoint Services, source allowlists, and certificate lifecycle.
This release supports Kubernetes 1.34 and 1.35.
Create these Secrets before applying the operator stages:

- `knative-serving/longlink-gateway-tls` for the registered gateway hostname.
- `rook-ceph/longlink-storage-tls` for the external S3 hostname and
  `rook-ceph-rgw-longlink.rook-ceph.svc`, including the full certificate chain.

Stop Platform workers for the Compute and apply these Kustomize directories in
order. Remove the existing `compute-release` ConfigMap before changing shared
infrastructure so an interrupted deployment cannot retain a stale ready contract.

1. `boundaries`
2. `operators/serving-crds`
3. `operators/serving`
4. `operators/kourier`
5. `operators/cnpg`
6. `operators/rook-crds`
7. `operators/rook`
8. `infrastructure`, or the hosting environment's overlay
9. `release`, only after the preceding resources are ready

Wait for CRDs before applying resources that use them. Wait for current controller
rollouts, admission webhook CA bundles, and Ceph readiness before applying the
release contract. The Platform independently checks the live cluster UID, contract,
controllers, Ceph topology, and authenticated HTTPS/S3 endpoints before publishing
Compute readiness.

Use server-side apply for the package; some CRDs exceed the client-side annotation
size limit. Review field ownership when adopting resources managed by older tooling
rather than automatically forcing conflicts.

The package does not provide a second deployment state machine. Use the hosting
repository's established Flux, Argo CD, or `kubectl` workflow to serialize
changes and retain deployment history. Never delete and recreate Ceph or PostgreSQL
to transfer field ownership.

## Releases

`release/release.yml` is both a Kubernetes ConfigMap and the authoritative package
version and Platform contract. Component versions remain authoritative in their
pinned manifests. To publish a release:

1. Update vendored releases and their Kustomize customizations.
2. Update `release/release.yml`.
3. Render every base and environment overlay.
4. Verify a fresh install and retained tenant data on every supported transition.
5. Publish a `compute-vX.Y.Z` tag from the default branch.

The release workflow publishes an immutable archive and SHA-256 checksum. The
hosting repository selects that archive independently from the Platform image.
Cross-version Ceph and PostgreSQL upgrades require operator-owned procedures.
