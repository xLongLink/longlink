# LongLink Compute package

The Compute package installs Knative, Kourier, CloudNativePG, Rook, and Ceph through
one Helmfile: **`setup.yaml.gotmpl`**. The
Platform validates an installed package and manages tenant resources; it never
installs or upgrades shared infrastructure.

```text
longlink/
├── k8s/ → shared infrastructure package
│   ├── boundaries/ → shared namespaces and ingress policies
│   ├── setup.yaml.gotmpl → chart versions, values, dependencies, and readiness hooks
│   ├── operators/ → pinned Knative/Kourier release URLs and Kustomize customizations
│   ├── infrastructure/ → shared Ceph resources and health identity
│   └── release/ → package version and Platform compatibility contract
└── dev/ → local setup and connectivity outside the API
    ├── tls.cnf → local gateway and S3 certificate extensions for OpenSSL
    ├── cluster.yaml → k3d settings, registry mirror, and loopback port mappings
    ├── compose.yml → registry, SMTP capture, and private Docker network
    └── compute/ → backing Kustomization, split DNS, NodePorts, and storage overlays
```

## Local installation

Requirements: Linux AMD64, Docker, k3d, kubectl **v1.35.4**, Helm **4.3.0**,
Helmfile **1.8.0**, standalone Kustomize **5.8.1**, OpenSSL, curl, uv, and the
existing Vite+ development tooling. No Helm plugins are required.

```bash
make install
make up
# Separate terminals:
make api
make web
# After the API is ready:
make image
make seed
```

`make up` creates the local cluster, registry, CSI hostpath backing provisioner,
and TLS Secrets, then runs Helmfile with the `development` environment. Helmfile
installs the releases in dependency order and publishes `release/release.yml`
last. Make then verifies gateway/S3 HTTPS through k3d's loopback port mappings.
The API runs directly on the host with ordinary HTTPS clients; local
CoreDNS makes the same S3 origin reachable by Solution Pods. See
[`dev/README.md`](../dev/README.md) for the complete connectivity contract.

To change or retry local infrastructure:

1. Stop `make api` and any independently started Platform workers.
2. Edit the package or `dev/compute/` overlays.
3. Run `make up`.
4. Restart `make api` to validate the installation.
5. Run `make seed` if tenant provisioning needs another attempt.

Reapplying infrastructure
preserves tenant namespaces, database PVCs, buckets, and credentials. `make down`
removes the complete local cluster.

## Configuration

The setup uses maintained upstream charts for CNPG and Rook:

| Release               | Chart                   | Operator version |
| --------------------- | ----------------------- | ---------------- |
| `cnpg-system/cnpg`    | `cloudnative-pg` 0.28.1 | 1.29.1           |
| `rook-ceph/rook-ceph` | `rook-ceph` v1.19.11    | v1.19.11         |

CNPG retains the `cnpg-controller-manager` Deployment name expected by the API.
Rook's Ceph CSI drivers and CSI operator remain disabled; its OBC provisioner
permits the two Organization bucket quota fields. Both charts manage their CRDs
as chart templates, including updates.

Helmfile packages the Kustomizations into temporary charts using its
built-in Chartify integration. There are no custom Helm charts to maintain.
Serving CRDs have a separate release, and bootstrap owns shared namespaces.
Kourier preserves its two upstream resource namespaces, so its Helm release record
uses the kubeconfig's default namespace. The release marker follows the same
convention; its ConfigMap remains in `longlink-system`.

Helm waits for rollouts. Hooks wait for Knative/CNPG webhook CA bundles and Ceph's
`Ready` status, which ordinary Deployment readiness does not establish. A failed
hook stops the dependent releases. The release marker depends on Kourier, CNPG,
and storage, so it is always installed last.

Environment overlays reference and patch the shared Ceph resources. The local
infrastructure overlay selects one 1 GiB OSD and monitor using `longlink-development`; the
shared base uses an illustrative `block-storage` StorageClass. Hosted environments
must supply overlays for their actual durable Block and filesystem provisioner.

Registration storage class, instance count, and per-OSD size describe the installed
topology and must match its overlay. Database defaults and tenant bucket policy
remain Platform-owned. Storage resizing is not supported by this release.

Render the entire setup without accessing a cluster (upstream downloads require
access to the upstream chart repositories and pinned GitHub release assets):

```bash
helmfile --file k8s/setup.yaml.gotmpl template
helmfile --file k8s/setup.yaml.gotmpl --environment development template
helmfile --file k8s/setup.yaml.gotmpl show-dag
```

## Hosted deployment

The hosting repository owns deployment coordination, retries, upgrades, and
rollback. It must supply the Kubernetes cluster, metrics service, storage
provisioner, endpoint Services, source allowlists, and certificate lifecycle.
This release supports Kubernetes 1.34 and 1.35.
Apply `boundaries` and create these Secrets before running Helmfile:

- `knative-serving/longlink-gateway-tls` for the registered gateway hostname.
- `rook-ceph/longlink-storage-tls` for the external S3 hostname and
  `rook-ceph-rgw-longlink.rook-ceph.svc`, including the full certificate chain.

Stop Platform workers for the Compute. Export `KUBECONFIG` so Helm and the kubectl
hooks address the same cluster. Remove the existing marker before changing shared
infrastructure so an interrupted deployment cannot retain a stale ready contract:

```bash
export KUBECONFIG=/absolute/path/to/compute.kubeconfig
kubectl delete configmap compute-release --namespace longlink-system --ignore-not-found
kubectl apply --server-side --field-manager=longlink-compute -k k8s/boundaries
# Provision the TLS Secrets using the hosting environment's certificate lifecycle.
helmfile --file k8s/setup.yaml.gotmpl \
  --state-values-set infrastructure=/absolute/path/to/storage-overlay sync
```

Use `sync` to reconcile every release, including recreation of the removed marker.
Hosting workflows serialize this command and retain deployment history. The API
independently checks the cluster UID, contract, controllers, Ceph topology, and
authenticated HTTPS/S3 endpoints before publishing Compute readiness.

### Existing installations

This changes shared resource ownership from kubectl to Helm. Existing installations
are not automatically adopted: Helm will reject resources owned by other tooling,
and some chart Deployment selectors differ from the former manifests. Do not use
forced adoption or deletion as a generic migration procedure.

Disposable local environments can be recreated with `make down` and `make up`.
Hosted installations need a reviewed, worker-stopped ownership migration that
preserves tenant data and reconciles obsolete operator RBAC. Never delete and
recreate Ceph or PostgreSQL to transfer ownership. Knative CRDs and shared Ceph
resources carry Helm's `keep` policy; they are not removed by release uninstall.

## Releases

`release/release.yml` is both a Kubernetes ConfigMap and the authoritative package
version and Platform contract. Chart versions and values are pinned in
`setup.yaml.gotmpl`; Knative/Kourier release URLs are pinned in their
Kustomizations, and Ceph's image is pinned in its manifest. The archive contains
these references and customizations; it does not bundle upstream charts or Knative
release assets. To publish a release:

1. Update chart versions/values, upstream release URLs, or Kustomize customizations.
2. Update `release/release.yml`.
3. Render both Helmfile environments and the local bootstrap/connectivity stages.
4. Verify a fresh install and retained tenant data on every supported transition.
5. Publish a `compute-vX.Y.Z` tag from the default branch.

The release workflow publishes an immutable archive and SHA-256 checksum. The
hosting repository selects that archive independently from the Platform image.
Cross-version Ceph and PostgreSQL upgrades require operator-owned procedures.
