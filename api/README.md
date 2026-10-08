<div align="center">

<img src="../banner.png" alt="LongLink banner" />

</div>

> [!WARNING]
> LongLink is under active development. APIs may change before 1.0.

<br />

## LongLink Platform API

LongLink provides the shared foundation for running Solutions.
The Platform API manages organizations, users, access,
deployments, and supporting infrastructure.

<br />

## Release

The API is published as a Linux AMD64 container image on GitHub Container
Registry.

| Name   | Image                        | Tag                               |
| ------ | ---------------------------- | --------------------------------- |
| Stable | `ghcr.io/xlonglink/longlink` | `v<major>.<minor>.<patch>`        |
| Beta   | `ghcr.io/xlonglink/longlink` | `v<major>.<minor>.<patch>-beta.N` |

<br />

## Registry connection requests

Registry creation accepts only `credential`; GHCR is the sole supported provider.
The former `provider` selector and other unknown request fields are rejected before
credentials are sent to GitHub. Clients that explicitly send `provider: "ghcr"`
must omit it when deploying this API contract; deploy the matching generated Web
client together with the API. Registry responses still expose the provider and
host. This request-contract change requires no database migration.

<br />

## Database upgrades

Revision `20261008_0004` removes redundant lease identifiers
and the stored GHCR provider. Existing installations must run this upgrade;
editing or stamping the initial migration is not sufficient.

Back up the Platform database, stop all API replicas and background workers,
then run `uv run --locked alembic upgrade head` from `api/` with the new release.
Restart only matching API replicas afterward: old and new binaries must not
share the changed schema. The shared-schema migration runner also requires the
matching SDK package bundled with the API release.

The upgrade retains lease expiries, registry credentials, connection identifiers,
and revision references. It refuses noncanonical activity rows (`id` different
from `organization_id`) or unsupported registry providers; resolve those rows
explicitly before retrying rather than deleting or collapsing them automatically.

<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
