<div align="center">

<img src="../banner.png" alt="LongLink banner" />

</div>

## LongLink Platform API

LongLink provides the shared foundation for running Solutions.
The Platform API manages organizations, users, access,
deployments, and supporting infrastructure.

<br />

## Release

The API is published as a Linux AMD64 container image on GitHub Container
Registry.

| Name   | Image                        | Tag                               | Published                            |
| ------ | ---------------------------- | --------------------------------- | ------------------------------------ |
| Stable | `ghcr.io/xlonglink/longlink` | `v<major>.<minor>.<patch>`        | When the matching Git tag is pushed. |
| Beta   | `ghcr.io/xlonglink/longlink` | `v<major>.<minor>.<patch>-beta.N` | When the matching Git tag is pushed. |

Beta tags also publish a matching OCI Compute chart and create a GitHub
pre-release. Neither publishing path deploys the image; deployments are pinned
and reviewed in [LinkLong](https://github.com/xLongLink/linklong).
The former mutable `nightly` tag is no longer published; existing GHCR images
and the sample repository's old nightly branch are not deleted by this change.

<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
