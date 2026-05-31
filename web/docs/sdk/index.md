---
lastUpdated: 2026-05-25
editUrl: https://github.com/xLongLink/longlink/edit/main/web/docs/sdk/index.md
---

# Application SDK

The LongLink SDK is a thin integration layer built on top of the standard Python backend ecosystem. It does not
introduce a new framework or replace existing tools. Instead, it provides a structured way to compose and connect them
within the LongLink platform.

Applications follow a simple model:

- Business logic lives in the application code
- Structured data is stored in a relational database
- Unstructured data is stored in S3-compatible object storage

## Getting Started

### Install

::: tabs

== pip

```bash
pip install longlink
```

== uv

```bash
uv add longlink
```

:::

### Initialize a Project

::: tabs

== pip

```bash
longlink init
```

== uv

```bash
uv run longlink init
```

:::

## Applications

`longlink init` creates a minimal application scaffold:

```text
├── src/
│   ├── api/          # Route registration
│   ├── models/       # Database models
│   ├── pages/        # XML page definitions
│   ├── types/        # Data schemas
│   └── envs.py       # Configuration
├── tests/
│   ├── api/          # API tests
│   └── conftest.py   # Test setup
├── main.py           # Entry point
├── Dockerfile        # Container build definition
├── pyproject.toml    # Project configuration
├── .env.sample       # Environment template
├── AGENTS.md         # Platform metadata
└── README.md
```

## Local Development

Install development dependencies:

::: tabs
== pip

```bash
pip install .[dev]
```

== uv

```bash
uv sync --extra dev
```

:::

Install development dependencies:

::: tabs
== pip

```bash
longlink dev
```

== uv

```bash
uv run longlink dev
```

:::

## Resources

- [Official FastAPI Backend Template](https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend)
