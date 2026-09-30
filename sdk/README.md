<div align="center">

<img src="../banner.png" alt="LongLink banner" />

[![PyPI version](https://img.shields.io/pypi/v/longlink)](https://pypi.org/project/longlink/)
[![Python versions](https://img.shields.io/pypi/pyversions/longlink)](https://pypi.org/project/longlink/)
[![License](https://img.shields.io/github/license/xLongLink/longlink)](https://github.com/xLongLink/longlink/blob/main/LICENSE)

[Website](https://www.longlink.dev/) &nbsp; - &nbsp; [Docs](https://www.longlink.dev/docs/) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

> [!WARNING]
> LongLink is under active development. APIs may change before 1.0.

<br/>

## Getting started

```bash
uvx --from longlink longlink init --folder .
uv sync --group dev
uv run longlink dev
```

> See [`xLongLink/sample`](https://github.com/xLongLink/sample) for a minimal LongLink Solution.

<br />

## Documentation

Check [LongLink Documentation](https://www.longlink.dev/docs/sdk/) or use the `cli` (designed for agents):

```bash
longlink docs --help
```

<br/>

## Development

```bash
make sdk
```

> Requirements: Python 3.12 or newer, `uv`, and Docker if you want to build an image. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for more details.

<br/>

## Testing

```bash
uv sync --group dev
uv run pytest --cov --cov-report=term-missing
```

<br/>
<br/>

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
