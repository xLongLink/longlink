# Fresh Compute Installation

`Kubernetes(kubeconfig)` is unchanged. `gateway.apply(gateway_url,
gateway_certificate=None) -> None` installs the bundled releases, waits for their
Deployments and CRDs, then requests `/ready` with `Host: internalkourier` over
hostname-verified HTTPS. The configured endpoint remains the TLS SNI name.
The HTTP `Host` used for Knative routing does not change that TLS identity: the
gateway certificate covers the configured gateway host, not each `.svc` name.
No server keys, CA keys, or client identities are generated or stored in Platform
metadata. `operations.computes.create` only records `Status.running` after this
check succeeds.

## Operator Prerequisites

- Use a dedicated, fresh Kubernetes cluster with a NetworkPolicy-enforcing CNI.
  CNPG 1.29 supports Kubernetes 1.33-1.35; validate the chosen distribution against
  Knative's requirements too. Bootstrap needs cluster-admin-equivalent access.
- Pre-create namespace `knative-serving` and TLS Secret `longlink-gateway-tls`
  with `tls.crt` and `tls.key`. Its certificate must cover `gateway_url`'s host.
  Certificate issuance and renewal belong to the operator. A public certificate
  uses system trust; a private certificate requires `gateway_certificate` PEM CA.
- Provision the LoadBalancer/DNS and allow only Platform source addresses through
  its external firewall. The Kourier Service exposes only `443 -> 8444`, using
  Kourier's cluster-local TLS listener and `externalTrafficPolicy: Local`.
  **API egress IPs must be distinct from tenant and node egress IPs: no shared
  SNAT.** Verify that the external firewall observes the original source and
  rejects requests from tenant/node egress, including public-LB hairpin traffic.
  Check both address families when IPv6 is enabled. A successful Platform
  readiness probe does not verify these rejection paths.
- Add an operator-owned ingress NetworkPolicy for external Platform source CIDRs
  to Kourier Pods (`app: 3scale-kourier-gateway`, namespace `kourier-system`), TCP
  `8444`. Bootstrap intentionally supplies **no external allow-all rule**.
  Preserve source addresses through the LB/CNI. Never allow node, Pod, tenant
  egress/NAT, or shared proxy CIDRs that would let tenants impersonate Platform
  sources. A firewall alone does not prevent in-cluster gateway bypass.
- In-cluster Platform API/worker Pods instead use namespace label
  `longlink.io/platform: 'true'` **and** Pod label `longlink.io/component: api`.
  Tenant operators must not have permission to change trusted namespace labels,
  shared policies, or create workloads in shared namespaces.
- API/worker processes need private routing and DNS resolution to database
  `.svc.cluster.local` addresses. The database policy admits those labelled
  Platform Pods. External workers need a separate narrowly scoped operator-owned
  database ingress policy for TCP `5432`, plus private routing/DNS.
- Supply a working CNPG-compatible `database_storage_class`. PVC retention at the
  storage-provider level follows that class's reclaim policy. Backups and disaster
  recovery are operator responsibilities, not part of this bootstrap.
- Compute egress permits public HTTPS and the compute's internal Ceph RGW S3
  gateway. Private/link-local and
  special-use destinations are excluded; private storage endpoints or other
  protocols need narrowly scoped operator policies. The built-in DNS rule targets
  `kube-system` Pods labelled `k8s-app: kube-dns`; distributions using a different
  DNS deployment need a correspondingly narrow DNS rule.

## Routing and Isolation

Solutions are `serving.knative.dev/v1` Services named `solution-{hyphenated UUID}`
in explicit `longlink-compute-{organization UUID hex}` namespaces. Requests use
`Host: solution-{UUID}.longlink-compute-{hex}.svc.cluster.local` over the configured
gateway HTTPS connection. There is no HTTPRoute or `x-longlink-solution-id`
routing. Service visibility is `cluster-local`; no per-Solution public DNS or TLS
certificate is needed.

Compute ingress admits only Kourier and selected Knative controllers, on
queue-proxy/probing/metrics ports. It never admits tenant traffic directly to
application port `8000`. Shared Kourier and activator policies prevent a tenant
from bypassing Platform authorization through those intermediaries. There is no
blanket namespace-wide tenant allow rule. Compute egress permits public TCP `443`,
cluster DNS, the matching database's Pods on TCP `5432`, and autoscaler statistics
on TCP `8080`. The public rule excludes IPv4 private, shared, loopback, link-local,
documentation, benchmarking, multicast and reserved ranges. IPv6 is limited to
global unicast `2000::/3`, excluding special protocol assignments, documentation
and 6to4 ranges; ULA, link-local, mapped IPv4 and NAT64 are outside that range.

The public rule intentionally permits sending HTTPS packets to a public gateway
LB. Its external API-IP allowlist must reject tenant/node sources as described
above. Direct in-cluster Kourier/activator ingress remains blocked by their
namespace policies. Public HTTPS, including public proxies, is not an isolation
boundary by itself: never place a tenant-accessible relay behind an allowlisted
API source IP. Kubernetes NetworkPolicies are additive, and IP matching around
Service/LB address translation depends on the CNI; validate these paths on the
target cluster. No gateway DNS/IP snapshot is used as a security control.
Kubelet/node-origin probes follow the CNI's node-traffic behavior.

Each revision scales from zero to at most two Pods, or keeps a minimum of one
when its immutable `min_scale` setting enables always-on operation. Queue-proxy budgets are
25m/200m CPU, 64Mi/128Mi memory and 64Mi/128Mi ephemeral storage (request/limit).
The compute quota includes rollout and migration headroom. Revision secrets and
migration Jobs remain isolated and retained until Solution deletion. Logs select
the `solution` container, not queue-proxy. Explicit failed readiness conditions
surface immediately, including quota failures; stale observed generations do not
fail a replacement rollout.

## Database Contract

Object storage installation, TLS prerequisites, IAM, and cleanup are documented
in [Rook/Ceph storage](STORAGE.md).

All methods are async:

```python
databases.apply(organization_id: UUID, password: str, storage_class: str,
                size_gib: int, instances: int) -> None
databases.hibernate(organization_id: UUID) -> None
databases.resume(organization_id: UUID) -> None
databases.is_hibernated(organization_id: UUID) -> bool
databases.idle(organization_id: UUID) -> bool
databases.certificate(organization_id: UUID) -> str
databases.delete(organization_id: UUID) -> None
```

The namespace is `longlink-database-{organization_id.hex}`; the CNPG Cluster is
`database`; the basic-auth Secret is `database-superuser`, username `postgres`.
`enableSuperuserAccess: true` supports the organization SQL provisioning utility in `src/utils/postgres.py`.
Independent database quotas do not consume compute capacity. Ingress allows the
matching Organization's compute Pods, Platform workers, CNPG management, and
replication. Plaintext TCP SQL is rejected by `pg_hba`.
CNPG management and same-cluster replication sources may access TCP `8000` and
`5432`; tenant compute can access only `5432`. Metrics port `9187` is not opened
because bootstrap installs no metrics collector. Database egress remains open for
CNPG Kubernetes API access and operator-configured backup plugins.

The Pod/CPU/memory quota budgets `2 * instances + 1` slots (one CPU and 1Gi limit
per slot): all database instances, their bootstrap/join Jobs, and one additional
backup/replacement Pod. Three instances therefore get seven slots. PVC/storage
quota remains `instances + 1` volumes at the configured size. Plugins that add
containers or need extra resources require an explicit quota adjustment.
Each instance requests `250m` CPU and `256Mi` memory and is limited to one CPU and
`1Gi`. In the pinned CNPG release, initdb/join Job containers and bootstrap init
containers inherit these same resource requirements. The default single-instance
cluster gets three Pod/resource slots and two configured-size PVC slots; init
container resource accounting does not add a second simultaneous instance budget.

Lifecycle code owns the SQL connection configuration: host
`database-rw.longlink-database-{hex}.svc.cluster.local`, port `5432`, username
`postgres`, and the Organization's persisted password.
`certificate()` reads and validates PEM CA text from Secret `database-ca`, key
`ca.crt`; this is not a filesystem path. Lifecycle code supplies the PEM to the
SQL provisioning utility for hostname-verified TLS. Clients must refresh trust when the CNPG
CA changes.

`apply` and `resume` require the current desired hibernation annotation to be
`off`, the hibernation condition to be absent, CNPG Ready, and exactly the desired
number of running, Ready, nonterminating database-instance Pods. A hibernation
condition with status `False` still represents shutdown work and does not admit
SQL access, even if the old health status says Ready.

`hibernate` refuses live compute/maintenance Pods, unsuspended nonterminal compute
Jobs (including migrations with no Pods yet), nonterminal database Jobs, and CNPG Backup
resources whose phase is not `completed` or `failed`. This includes pending,
running, finalizing, unknown, and plugin backups with no separate Pod. It waits
for the hibernation condition plus absence of live database Pods. Retained terminal
Pods, Jobs, and Backup resources do not prevent sleep. Callers must serialize
hibernation with activation/deployment using the Organization lifecycle lock.
Backup scheduling also needs coordination: the final idle check and the CNPG
annotation update are not an atomic scheduling barrier against a new backup.
Knative scale-to-zero alone does not wake a hibernated database: Platform must
resume it before forwarding traffic.

`organizations.apply(namespace: str)` and `delete(namespace: str)` retain their
string APIs; callers supply the new compute prefix. `gateway.delete()` is only for
dedicated-cluster teardown after tenant cleanup. It removes shared namespaces but
retains cluster RBAC and CRDs, avoiding accidental cascading database destruction.

## Pinned Sources

Release manifests are downloaded once and committed under `templates/`, locking
their exact contents in the repository. The API container packages those files
directly, so cluster reconciliation never depends on GitHub availability. Bootstrap
applies LongLink overrides in memory.

- https://github.com/knative/serving/releases/download/knative-v1.23.0/serving-crds.yaml
- https://github.com/knative/serving/releases/download/knative-v1.23.0/serving-core.yaml
- https://github.com/knative-extensions/net-kourier/releases/download/knative-v1.23.0/kourier.yaml
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.29.1/releases/cnpg-1.29.1.yaml

Kourier's upstream mutable `envoy:v1.37-latest` is overridden with the multiarch
image digest `sha256:ea33a83e4bb1b34b9345f1d98930af9c70d19a0ee1680d9ff087789636fdbc34`
resolved from Docker Hub on 2026-09-09. Knative controller/queue images already use
digests; CNPG uses its explicit `1.29.1` release tag.

Validated upstream references:

- https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/
- https://raw.githubusercontent.com/knative-extensions/net-kourier/knative-v1.23.0/pkg/generator/caches.go
- https://raw.githubusercontent.com/knative/serving/knative-v1.23.0/pkg/apis/serving/fieldmask.go
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.29.1/docs/src/supported_releases.md
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.29/docs/src/declarative_hibernation.md
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.29.1/api/v1/backup_types.go
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.29.1/docs/src/security.md
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.29.1/pkg/specs/jobs.go
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.29.1/pkg/specs/containers.go

Kourier documents `cluster-cert-secret` as alpha. This integration deliberately
pins the release containing the verified single-certificate local-TLS behavior.
Live-cluster admission, CNI/LB source preservation, certificate renewal, activation,
and CNPG failover still require deployment verification in the target environment.
