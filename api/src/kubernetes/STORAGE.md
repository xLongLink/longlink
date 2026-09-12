# Rook/Ceph object storage

LongLink installs Rook **v1.19.11** and Ceph **v19.2.6**, then creates one
`CephObjectStore` named `longlink` in `rook-ceph` per compute. The upstream
operator, common resources, and CRDs are committed under `templates/platform/`.
Ceph CSI drivers and the separate CSI operator are disabled: this integration
provides S3, and consumes an independently installed backing PVC provisioner.

## Compute prerequisites

- A dedicated Kubernetes cluster with a NetworkPolicy-enforcing CNI.
- An existing independent `storage_class` supporting **raw Block PVCs** for
  OSDs and filesystem PVCs for monitors. Ceph cannot bootstrap on a StorageClass
  provided by the Ceph cluster it is creating. k3d's default `local-path`
  provisioner is suitable for CNPG but does **not** satisfy this requirement.
- For production, three nodes and `storage_instances=3`. The supported topology
  provisions three OSDs and three monitors, with replicated pools using host
  failure domains. `storage_size_gib` is capacity **per OSD**, not a bucket quota
  or the sum of usable replicated capacity. Monitors additionally request 10 GiB
  each. `storage_instances=1` is an explicitly non-HA development topology.
  `make up` and local seeding provision the `longlink-development` CSI hostpath
  class automatically. Local k3d nodes mount `/dev` and `/run/udev` to support
  the driver's loop-backed Block PVCs; only explicitly provisioned PVCs are
  selected by Ceph. Production must supply a durable backing provisioner.
- Pre-create `rook-ceph` and Secret `longlink-storage-tls` of type
  `kubernetes.io/tls`, with `tls.crt` and `tls.key`. The certificate must cover
  `rook-ceph-rgw-longlink.rook-ceph.svc` and the registered `storage_endpoint`
  hostname. Include the full certificate chain in `tls.crt` for Rook's own
  management connections. Supply public CA PEM in `storage_certificate` when
  clients need private trust. Certificate issuance/renewal belongs to the operator.
- In production the HTTPS `storage_endpoint` must be reachable by both Platform workers and
  Solution Pods. External workers require private routing/DNS or an explicitly
  configured HTTPS service. No public or insecure storage endpoint is created.
  Host-run development workers instead use authenticated Kubernetes port-forwarding
  with a client-scoped resolver. The endpoint hostname remains the TLS identity
  and SigV4 signing authority; in-cluster workloads use the service directly.
- Allow enough provisioning time using `OPERATION_TIMEOUT_SECONDS` (up to 1740).
  Reconciliation is idempotent, so a timed-out installation can be retried.

## Ownership and IAM

Each organization owns an `ObjectBucketClaim` named `storage` in
`longlink-storage-{organization UUID hex}`. Rook generates the actual bucket name
and owner credentials. LongLink resolves them from that claim's ConfigMap and
Secret; the owner credentials never enter Solution environments.

Each Solution has a `CephObjectStoreUser` in `rook-ceph` named
`solution-{Solution UUID hex}`. These names are RGW UIDs, and therefore match
policy principals `arn:aws:iam:::user/solution-{hex}`. Users have no administrative
capabilities and `maxBuckets=-1`, which disables bucket creation. Rook owns key
generation and deletion. LongLink does not independently rotate keys behind Rook.

The serialized operation worker rebuilds each bucket policy from active,
provisioned Solution identities. Object reads cover `shared/` and the Solution's
own `solutions/{hex}/` prefix. Writes, deletes, and multipart operations are
restricted to that Solution prefix. ListObjects/ListObjectVersions require a
permitted prefix, including its trailing slash. Bucket-wide multipart inventory
is not granted. Ceph Squid does not implement bucket-owner-enforced ownership.
Instead, the policy explicitly grants the bucket owner cleanup access and denies
unknown principals and out-of-scope object access, overriding uploader ownership
and object ACL grants. Public ACL blocking is enabled. Bucket public-policy
blocking is disabled because Squid classifies this cross-user policy as public;
the explicit principal denials enforce the boundary. Solution ACL mutation APIs
are denied. Multipart upload ACL handling differs from ordinary uploads, so tests
also prove that even an accepted multipart ACL grant cannot broaden access.

The SDK's directory wrapper is a convenience, not the authorization boundary.
Credentials must remain restricted when used directly through an arbitrary S3
client. Changing an SDK path cannot grant access to another tenant.

## Lifecycle and cleanup

Organization creation provisions the claim and applies the access policy before
publication. Solution deployment persists scoped credentials
before publishing their policy grant and workload. Failed initial SQL provisioning
leaves any generated storage user without bucket access; retries reuse it.

Deletion stops workloads, removes Solution users, rebuilds the policy, and cleans
objects with the bucket owner's credentials. Cleanup includes object versions,
delete markers, and incomplete multipart uploads. Organization deletion removes
all labelled Solution users and empties the bucket before deleting the namespace.
The bucket StorageClass has `reclaimPolicy: Delete`; Rook's claim finalizer owns
final bucket/owner deletion. Shared Ceph pools are retained on object-store deletion.

Storage remains always on. Database hibernation does not stop RGW or Ceph.
Usage reports current logical object bytes, not replicas or historical versions.
Backups, expansion, storage-device recovery, and disaster recovery are infrastructure
operator responsibilities.

## Verification

From `api/`:

```bash
uv run --extra dev pytest tests/adapters/storage/test_s3.py -v
```

This uses the actual pinned Ceph image with a disposable RADOS/BlueStore backend,
not an S3 emulator. It checks the production policy and SDK against real RGW.
The test exercises verified HTTPS through a private CA, including SDK access.
Deployment verification must additionally exercise Rook CRD admission, user/claim
finalizers, and CNI rules on the target Kubernetes cluster.

This is a fresh-install schema replacement. It does not migrate or destroy
objects in an earlier external object store. Stop API workers before running
`python -m scripts.cleanup`; it removes only resources associated with registered
organizations and retains shared infrastructure.
