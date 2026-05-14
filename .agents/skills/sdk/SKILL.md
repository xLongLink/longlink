---
name: sdk
description: LongLink SDK structure
---

## Structure

```text
longlink/
├── sdk/                         # Python SDK for apps and control-plane integration
│   ├── longlink/                # SDK package source
│   │   ├── cli/                 # Command-line entry points
│   │   ├── app/                 # App runtime, API wiring, and lifecycle helpers
│   │   ├── storage/             # Storage abstractions built on fsspec
│   │   ├── db/                  # SQLAlchemy models and Alembic migrations
│   │   └── tests/               # SDK tests
│   └── sample/                  # Example SDK app and fixtures
```

##

```python
from longlink import LongLink

```

## Environments

- Built on top of Pydantic Settings.
- Ensure that all environment variables are defined at startup.

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

- Wraps FastAPI, with additional support for dependency injection and lifecycle management.

```py
from longlink import App, Router

router = Router()

@router.get("/sample")
async def sample():
    return {"id": 1, "name": "apple"}

app = App()
app.register(router)
```

## Pages

```py
from longlink import page

@page("/sample")
async def sample():
    return {"id": 1, "name": "apple"}

app = App()
app.register(router)
```

## Storage

- Built on top of `fsspec`
- `:memory:` for testing
- `local` for local development
- `s3` for production deployments (`s3fs`)$

```py
from longlink import fs

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")
```

## Database

- Built on top of SQLModel
- `:memory:` for testing
- `sqlite` for local development
- `postgresql` for production deployments (`asyncpg`)

```py
from longlink import db

class Project(db.Table):
    id: int = db.Field(default=None, primary_key=True)
    name: str = db.Field(description="Project name")
    owner: str = db.Field(description="Project owner")


async def create_project() -> None:
    session_maker = await db.get_session()
    async with session_maker() as session:
        session.add(Project(name="Launch", owner="ops"))
        await session.commit()
```

### Migrations

- Built on top of Alembic

```bash
longlink migrate
```

## Testing

Dev
aiosqlite

Prod

pytest
pytest-asyncio
pytest-mock
