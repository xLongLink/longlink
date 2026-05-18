# Database

LongLink SDK exposes a `db` object for database access.
You use `db.Table` to define tables and `await db.get_session()` to open a session.

The SDK keeps the database API small and explicit.

## Usage

```python
from longlink import db
from pydantic import Field


class Project(db.Table):
    name: str = Field(description="Project name")
    owner: str = Field(description="Project owner")


async def create_project() -> None:
    session_maker = await db.get_session()
    async with session_maker() as session:
        session.add(Project(name="Launch", owner="ops"))
        await session.commit()
```

After you add or change models, run migrations to keep the database schema aligned:

::: code-group

```bash [uv]
uv run longlink migrate
```

```bash [pip]
longlink migrate
```

:::

This keeps schema changes synchronized with application code.

## Resouces

- [SQLModel GitHub](https://github.com/fastapi/sqlmodel)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com/)
- [SQLAlchemy GitHub](https://github.com/sqlalchemy/sqlalchemy)
- [SQLAlchemy Documentation](https://www.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/en/latest/)
- [Alembic GitHub](https://github.com/sqlalchemy/alembic)
