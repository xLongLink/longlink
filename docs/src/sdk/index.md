# Application SDK

The LongLink SDK is a thin integration layer built on top of the standard Python backend ecosystem. It does not introduce a new framework or replace existing tools. Instead, it provides a structured way to compose and connect them within the LongLink platform.

Applications follow a simple model:

- Business logic lives in the application code
- Structured data is stored in a relational database
- Unstructured data is stored in S3-compatible object storage

## Getting Started

### Install

::: code-group

```bash [pip]
pip install longlink
```

```bash [uv]
uv add longlink
```

:::

### Initialize a Project

::: code-group

```bash [pip]
pip install longlink
longlink init
```

```bash [uv]
uv add longlink
uv run longlink init
```

:::

This creates a standardized project structure:

```
├── app/
│   ├── api/          # API routes
│   ├── models/       # Database models
│   ├── types/        # Data schemas
│   ├── utils/        # Shared utilities
│   └── envs.py       # Configuration
├── tests/
│   ├── api/          # API tests
│   └── conftest.py   # Test setup
│
├── .env.sample       # Environment template
├── AGENTS.md         # Platform metadata
├── main.py           # Entry point
├── pyproject.toml    # Project configuration
└── README.md
```

### Local Development

Install development dependencies:

::: code-group

```bash [pip]
pip install .[dev]
longlink dev
```

```bash [uv]
uv add .[dev]
uv run longlink dev
```

:::

## Resouces

- [Official FastAPI Backend Template](https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend)
