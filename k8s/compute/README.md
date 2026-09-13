# LongLink Compute package

The Compute package installs shared infrastructure independently of the Platform
API. The first release, **0.1.0**, preserves the existing Knative, Kourier, CNPG,
Rook, and Ceph versions. Component versions and Kubernetes compatibility live in
`release.yaml`.

```text
longlink/
├── k8s/compute/ → shared infrastructure product
│   ├── release.yaml → version, contract, compatibility, and ordered stages
│   ├── boundaries/ → shared namespaces and ingress policies
│   ├── operators/ → vendored upstream manifests + Kustomize customizations
│   ├── infrastructure/ → shared Ceph resources and health identity
│   └── scripts/deploy.py → staged apply and readiness verification
├── dev/compute/ → local environment overlays
│   ├── operators/rook/ → explicitly allow development loop devices
│   └── infrastructure/ → one 20 GiB OSD using longlink-development
└── api/src/kubernetes/ → Platform runtime
    ├── Validate the installed package and HTTPS endpoints
    ├── Create Organization databases and buckets
    ├── Reconcile quotas, credentials, and prefix policies
    └── Deploy Solutions and execute tenant migrations
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
and TLS Secrets, then runs `make compute` before building the sample image.
k3s supplies local metrics-server; local certificates use the generated development
CA. cert-manager is not required for this local environment.

`make seed` registers the already-installed Compute and queues Organization and
Solution provisioning. Neither seed nor API release reconciliation installs
operators. The API verifies the package contract, physical cluster UID, current
controller rollouts, Ceph topology/replication, and authenticated HTTPS/S3 access.

## Local changes and retry

1. Stop `make api` and any independently started Platform workers.
2. Edit `dev/compute/` overlays or the package source.
3. Run `make compute`.
4. Restart `make api` to revalidate the installed Compute.
5. Run `make seed` if sample provisioning needs to be retried.

The local installer takes an exclusive `dev/compute.lock`; `make api` holds a
shared lock for its worker lifetime. This prevents those commands from racing.
Directly launched workers must also be stopped. `make compute` never deletes
tenant namespaces, database PVCs, buckets, or credentials.

An interrupted attempt leaves `longlink-system/compute-deployment`. Rerunning the
same configuration resumes from live state. A successful install writes
`longlink-system/compute-release` and removes the pending marker. The record
contains the package version, API contract, cluster UID, component inventory,
rendered configuration digest, and completion time.

If an interrupted development configuration itself needs correction, review the
live resources before rerunning with `--adopt`:

```bash
uv run --script k8s/compute/scripts/deploy.py apply \
  --local --adopt \
  --overlay dev/compute \
  --kubeconfig api/kubeconfig.yaml \
  --cluster-uid "$(kubectl --kubeconfig api/kubeconfig.yaml get namespace kube-system -o jsonpath='{.metadata.uid}')"
```

`--adopt` permits adoption without an existing successful release record; it does
not force server-side field conflicts or bypass supported release transitions.
Existing pre-package installations require this explicit adoption. Never delete
and recreate Ceph or PostgreSQL to transfer ownership.

## Configuration and rendering

An environment overlay mirrors only stages it customizes. Other stages use the
package base. For example, `dev/compute/infrastructure/kustomization.yaml`
references `k8s/compute/infrastructure` and patches local storage settings.
The shared base uses an illustrative `block-storage` StorageClass; hosted
environments must replace it with their actual backing class.

Render all stages without accessing a cluster:

```bash
uv run --script k8s/compute/scripts/deploy.py render --overlay dev/compute
```

Registration storage class, instance count, and per-OSD size currently describe
the installed topology. They must match the overlay. They no longer request Ceph
installation. Database instance/size defaults and bucket/admission policy remain
Platform-owned. Storage resizing is not certified by this initial release.

## Hosted deployment prerequisites

The hosting repository supplies the Kubernetes cluster, metrics service, durable
Block/filesystem provisioner, endpoint Services, source allowlists, and certificate
lifecycle. If it uses cert-manager, install and verify cert-manager before applying
Certificate resources. Prepare these Secrets before installing this package:

- `knative-serving/longlink-gateway-tls` for the registered gateway hostname.
- `rook-ceph/longlink-storage-tls` for the external S3 hostname and
  `rook-ceph-rgw-longlink.rook-ceph.svc`, including the full certificate chain.

The initial installer supports hosted **offline installation/adoption only**:

```bash
uv run --script compute/scripts/deploy.py apply \
  --offline --overlay /path/to/environment \
  --kubeconfig /path/to/compute.kubeconfig \
  --cluster-uid '<expected-kube-system-namespace-uid>'
```

All Platform workers for that Compute must be stopped. `--offline` is an explicit
operational assertion, not a remote worker-draining mechanism. Git-driven online
maintenance coordination, administrative status UI, hosted prerequisite packaging,
and `linklong` workflow migration are subsequent implementation work.

## Releases and upgrades

1. Change the relevant vendored release and review upstream upgrade requirements.
2. Update Kustomize customizations and `release.yaml` together.
3. Run package rendering, existing schema checks, and fresh-install verification.
4. Verify retained data, credentials, quotas, and interrupted retry on each proposed
   source release before adding it to `upgradeFrom`.
5. Publish a `compute-vX.Y.Z` tag from the default branch when ready for release.
6. The Compute package workflow runs repository checks and publishes an archive
   with a SHA-256 checksum; existing release assets are not overwritten.
7. The hosting repository selects that archive/checksum separately from its
   Platform image digest.

Release 0.1.0 has no certified cross-version upgrade paths. It supports fresh
installation, explicit baseline adoption, and same-release reconciliation. The
installer never automatically downgrades Ceph/PostgreSQL or prunes stateful
resources. PostgreSQL major upgrades require a separate procedure.

The script uses server-side apply with the `longlink-compute` field manager. It
leaves webhook CA bundles and Knative's dynamically generated webhook rules to
their controllers, waits for each stage's deployments and webhook trust, and waits
for Ceph resources to acknowledge their current generation. An API registration
then verifies endpoint connectivity before publishing Compute readiness.

## Local verification performed

- Fresh k3d installation and interrupted-install retry.
- Read-only Compute registration and Organization provisioning.
- Sample migration and Knative deployment.
- Authenticated Platform proxy creating a PostgreSQL-backed sample item.
- Sample upload and listing through its scoped S3 credentials.
- Same-release reapplication preserving the database record and S3 attachment.
- Local deployment exclusion while `make api` is running.

This establishes the local workflow, not a production HA or cross-version upgrade
certification. Tenant cleanup remains in `api/scripts/cleanup.py`; complete local
cluster removal remains `make down`.
