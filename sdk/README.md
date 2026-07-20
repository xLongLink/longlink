<div align="center">

# LongLink SDK

Python SDK for building and packaging LongLink applications, including shared organization models, synchronization helpers, and migrations.

[![PyPI version](https://img.shields.io/pypi/v/longlink)](https://pypi.org/project/longlink/)
[![Python versions](https://img.shields.io/pypi/pyversions/longlink)](https://pypi.org/project/longlink/)
[![License](https://img.shields.io/github/license/xLongLink/longlink)](https://github.com/xLongLink/longlink/blob/main/LICENSE)

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

## Gettin started

```bash
longlink init
```

> See [`xLongLink/sample`](https://github.com/xLongLink/sample) for a minimal LongLink application that demonstrates SDK setup, XML pages, translations, routes, tests, and Docker image builds.

<br/>

## Development

```bash
make sdk
```

This builds the SDK web bundle, recreates `sdk/dev`, links that generated app to the local SDK source, and starts the SDK development app. Do not keep manual changes in `sdk/dev`; it is recreated by this command.

> Requirements: Python 3.14 or newer, `uv`, and Docker if you want to build an image. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for more details.

<br/>

## Testing

```bash
uv sync --extra dev
uv run pytest tests
```

The `longlink` package owns the shared-schema model and migration definitions as well as application migration tooling. The Platform API executes shared migrations and writes with control-plane credentials; application runtimes use the same shared model with read-only database access.

<br/>

## Storage

The LongLink Platform provides one physical bucket per Organization and scopes each runtime with these variables:

| Variable                         | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `LONGLINK_STORAGE_BUCKET`        | Physical Organization bucket.                        |
| `LONGLINK_STORAGE_PREFIX`        | Application storage prefix under that bucket.        |
| `LONGLINK_STORAGE_REGION`        | Provider signing region when required.               |
| `LONGLINK_STORAGE_SHARED_PREFIX` | Organization shared-storage prefix under the bucket. |

Pass the bucket and the relevant prefix to `create_fs`. The returned filesystem treats that prefix as its root, so Application code uses only paths relative to its scoped view. Development and testing can leave all four values unset to use the local and in-memory filesystem roots.

<br/>
<br/>

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
