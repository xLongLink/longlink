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

AI has changed the economics and cost structure of software creation. As solutions become faster and cheaper to build, more workflows, processes, and operational needs can be expressed directly in code. However, without the right engineering foundations, complexity, fragility, and technical debt can gradually erode those initial benefits over time.

LongLink provides that foundation. It turns real-world processes into well-structured, maintainable Python solutions while handling the common layer around every solution: authentication, permissions, deployment, storage, routing, logging, governance, and operational structure. Users define how the work should happen; developers focus on the solution logic.

Specific workflows can be customized through code, built quickly with modern AI-assisted tooling, and maintained with the discipline of proper engineering. LongLink brings software-development principles to the broader world of work, making valuable processes structured, deployable, reviewable, and economical to maintain over time.

<br />

## Getting Started

Requirements: `Python 3.12` or newer.

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

## Goals

- **Keep it simple**: Processes are clear, easy to operate and cheap to maintain.
- **Own the process**: Compliance, accountability and a solution that fit the needs.
- **Separate responsibilities**: Clear distinction between a machine and a human task.

LongLink aims to bring software-development principles to the way organisations design and operate their processes by creating a clear boundary between what is a computer task and what requires a human decision. This approach aligns with [UN Sustainable Development Goal 9](https://sdgs.un.org/goals/goal9) and supports organisations working towards relevant ISO certifications and guidance, including [ISO 9001](https://www.iso.org/standard/62085.html), [ISO 22301](https://www.iso.org/standard/75106.html), [ISO 31000](https://www.iso.org/standard/65694.html), [ISO 37301](https://www.iso.org/standard/75080.html), and [ISO 37000](https://www.iso.org/standard/65036.html).

<br />

## Development

Work on the LongLink Platform:

```bash
make api    # In one terminal
make seed   # In another terminal after the API starts
make web    # In another terminal
```

Work on the LongLink SDK runtime:

```bash
make sdk
```

Cleanup

```bash
make clean  # Remove tracked remote development resources
make down   # Stop local services and the cluster; retain volumes
make clear  # Remove local Compose volumes
```

<br />
<br />

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](./CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
