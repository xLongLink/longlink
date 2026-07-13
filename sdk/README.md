<div align="center">

# LongLink SDK

Python SDK for building and packaging LongLink applications, including shared organization contracts and migrations used by the Platform API.

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
uv sync --extra runtime --extra cli --extra dev
uv run pytest tests
```

The base `longlink` package contains the lightweight `longlink.tenant` models, database migrations, and storage contracts used by the Platform API. Applications install `longlink[runtime]` for FastAPI, database drivers, XML, and storage backends.

<br/>
<br/>

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
