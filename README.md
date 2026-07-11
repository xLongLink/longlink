<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

<br />
<br />

## Introduction

AI has changed the economics and cost structure of software creation. As applications become faster and cheaper to build, more workflows, processes, and operational needs can be expressed directly in code, providing greater flexibility, control, and long-term maintainability than rigid generic SaaS products, spreadsheets, manual coordination, or fragile no-code automations. But speed and lower cost alone are not enough: without a shared foundation, this new wave of application creation risks producing duplicated infrastructure, inconsistent systems, and long-term technical debt.

LongLink provides that foundation. It turns real-world processes into production-grade Python codebases while handling the common layer around every app: authentication, permissions, deployment, storage, routing, logs, governance, and operational structure. Users define how the work should happen; developers focus on the application logic.

Specific workflows can be customized like software, built quickly like modern AI-assisted applications, and maintained with the discipline of proper engineering. LongLink brings software-development principles to the broader world of work, making valuable processes structured, deployable, reviewable, and cheap to maintain over time.


<br />

## Get Started

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

## Development

Work on the control plane:

```bash
make up
make seed
make api    # In one terminal
make web    # In another terminal
```

Work on the SDK runtime::

```bash
make sdk
```

<br />
<br />

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.ch)

</div>

---
