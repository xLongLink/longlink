# Application SDK

The LongLink SDK is a thin integration layer built on top of the standard Python backend ecosystem. It does not introduce a new framework or replace existing tools. Instead, it provides a structured way to compose and connect them within the LongLink platform.

Applications follow a simple model:

- Business logic lives in the application code
- Structured data is stored in a relational database
- Unstructured data is stored in S3-compatible object storage

## Getting Started

### Install

::: code-group

```bash [uv]
uv add longlink
```

```bash [pip]
pip install longlink
```

:::

### Initialize a Project

::: code-group

```bash [uv]
uv add longlink
uv run longlink init
```

```bash [pip]
pip install longlink
longlink init
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

### Local Development

Install development dependencies:

::: code-group

```bash [uv]
uv add .[dev]
uv run longlink dev
```

```bash [pip]
pip install .[dev]
longlink dev
```

:::

## Resouces

- [Official FastAPI Backend Template](https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend)
