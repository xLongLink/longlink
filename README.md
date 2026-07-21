<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

<br />
<br />

> [!WARNING]
> LongLink is currently in development. \
> APIs, features, license and documentation may change as the project evolves.

<br />

## Introduction

AI has changed the economics and cost structure of software creation. As applications become faster and cheaper to build, more workflows, processes, and operational needs can be expressed directly in code. However, without the right engineering foundations, complexity, fragility, and technical debt can gradually erode those initial benefits over time.

LongLink provides that foundation. It turns real-world processes into well-structured, maintainable Python applications while handling the common layer around every application: authentication, permissions, deployment, storage, routing, logging, governance, and operational structure. Users define how the work should happen; developers focus on the application logic.

Specific workflows can be customized through code, built quickly with modern AI-assisted tooling, and maintained with the discipline of proper engineering. LongLink brings software-development principles to the broader world of work, making valuable processes structured, deployable, reviewable, and economical to maintain over time.

<br />

## Getting Started

Requirements: `Python 3.14` or newer.

```bash
uvx longlink init --folder <folder>
cd <folder>
uv sync
uv run longlink dev
```

<details>
<summary>What about classic pip?</summary>

```bash
python -m pip install longlink
longlink init --folder <folder>
cd <folder>
python -m venv .venv
source .venv/bin/activate
python -m pip install -e .
longlink dev
```

</details>

<br />

## Principles

- The usage must be intuitive. Anything unclear is considered a bug.

<br />

## Development

Work on the LongLink Platform:

```bash
make seed
make api    # In one terminal
make web    # In another terminal
```

Work on the LongLink SDK runtime:

```bash
make sdk
```

Cleanup

```bash
make down
```

<br />
<br />

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](./CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
