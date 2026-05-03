# Database

The database layer in LongLink is a **structured abstraction on top of SQLAlchemy and Alembic**, providing a consistent way to define, access, and evolve application data.

It is designed to integrate directly with the application model: each application operates on its **own isolated database**, while developers interact only with models and migrations—without managing low-level database concerns.

The SDK handles:

- model definition using [SQLAlchemy](https://www.sqlalchemy.org/)
- schema evolution through [Alembic](https://alembic.sqlalchemy.org/en/latest/) migrations
- automatic migration management via CLI tooling

## Basic database example

You create a database by defining the database URL in the application environment, then defining tables with the SDK `Table` base.

```python
from longlink import Settings, Table
from pydantic import Field
from sqlmodel import Session, create_engine


class Env(Settings):
    DBURL: str


class Project(Table):
    name: str = Field(description="Project name")
    owner: str = Field(description="Project owner")


env = Env()
engine = create_engine(env.DBURL)
Table.metadata.create_all(engine)

with Session(engine) as session:
    session.add(Project(name="Launch", owner="ops"))
    session.commit()
```

After you add or change models, run migrations to keep the database schema aligned:

```bash
longlink migrate
```

This ensures that database schemas remain **synchronized with application logic**, while keeping the workflow simple and predictable.

The result is a database layer that is:

- tightly integrated with application logic
- versioned and reproducible through migrations
- managed through a minimal, standardized interface

## References

- [SQLModel GitHub](https://github.com/fastapi/sqlmodel)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com/)
- [SQLAlchemy GitHub](https://github.com/sqlalchemy/sqlalchemy)
- [SQLAlchemy Documentation](https://www.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/en/latest/)
- [Alembic GitHub](https://github.com/sqlalchemy/alembic)
