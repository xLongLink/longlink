---
name: sdk
description: LongLink SDK structure
---

LongLink SDK packages the Python runtime, CLI, storage and database helpers, XML support, and the project scaffold copied by `longlink init`.

## Example

```python
from longlink import Environments, LongLink


class Env(Environments):
    KEY: str = "longlink"


env = Env()
app = LongLink(env=env)
```

## Structure

```text
longlink/
├── sdk/
│   ├── longlink/                # SDK package source
│   │   ├── .static/             # Packaged assets, schemas, and templates
│   │   │   ├── llm/             # Human-readable schema docs
│   │   │   ├── web/             # Packaged frontend assets
│   │   │   ├── xsd/             # XML schema definitions
│   │   │   └── new/             # Minimal app scaffold copied by `longlink init`
│   │   ├── cli/                 # Command-line entry points
│   │   ├── database/            # SQLAlchemy helpers and migrations
│   │   ├── routes/              # Route metadata helpers
│   │   ├── storage/             # Storage abstractions
│   │   ├── types/               # Shared SDK types
│   │   ├── utils/               # XML, metadata, and page helpers
│   │   ├── app.py               # App runtime and page loading
│   │   ├── router.py            # Router wiring
│   │   ├── constants.py         # Shared constants
│   │   └── __init__.py          # Public exports
│   └── tests/                   # SDK tests
└── docs/                        # SDK docs and XML docs
```

## SDK Areas

Core runtime:

- `longlink/app.py` handles app setup and page loading.
- `longlink/router.py` wires route registration.
- `longlink/__init__.py` exposes the public SDK API.

CLI:

- `longlink/cli/` contains `dev`, `build`, `init`, and migration commands.

Storage and database:

- `longlink/storage/` wraps filesystem access.
- `longlink/database/` contains SQLModel and Alembic helpers.

XML support:

- `longlink/.static/xsd/` stores schema definitions.
- `longlink/.static/web/` stores packaged runtime assets.
- `sdk/tests/xml/` covers XML primitives and components.

Project scaffold:

- `longlink/.static/new/` is the minimal showcase app scaffold.

## Environments

- Built on top of Pydantic Settings.
- Keep environment models explicit and validated at startup.

```python
from longlink import Environments, LongLink


class Env(Environments):
    """Project-specific environment model."""

    FEATURE_FLAG: bool
    EXTERNAL_API: str


env = Env()
app = LongLink(env=env)
```

## Routes

- Use `Router` for FastAPI routes.

```python
from longlink import Router


router = Router()


@router.get("/sample")
async def sample():
    return {"id": 1, "name": "apple"}
```

## Pages

- XML pages live under `sdk/longlink/.static/new/src/pages/` in the scaffold.
- Declare pages with the `page` decorator exported from `longlink`.

```xml
<Page>
  <p>Hello from XML.</p>
</Page>
```

## Storage

- Built on top of `fsspec`.
- Use `:memory:` for tests, local files for development, and S3-compatible storage for production.

```python
from longlink import fs


with fs.open("reports/example.txt", "wb") as file_handle:
    file_handle.write(b"hello")
```

## Database

- Built on top of SQLModel.
- Use SQLite for local development and async-compatible drivers for production.

```python
from longlink import db


class Project(db.Table):
    id: int = db.Field(default=None, primary_key=True)
    name: str = db.Field(description="Project name")


async def create_project() -> None:
    session_maker = await db.get_session()
    async with session_maker() as session:
        session.add(Project(name="Launch"))
        await session.commit()
```

## Migrations

- Built on top of Alembic.

```bash
longlink migrate
```

## Testing

- `sdk/tests/cli/` covers scaffold and CLI behavior.
- `sdk/tests/xml/` covers runtime XML behavior.
- `sdk/tests/utils/` covers SDK helpers and metadata.
