# Database Layer

The database layer wraps SQLAlchemy models and service classes so the rest of the
API can work with a consistent `src.db` interface.

## Structure

```text
src/db/
├── models/    # SQLAlchemy models
├── services/  # Async database operations
├── session.py # Session management
└── __init__.py
```

## Usage

Import the database layer once and use the service instances:

```python
import src.db as db

org = await db.orgs.create('Acme')
await db.orgs.add(org.id, user.id, db.OrgRole.owner)
app = await db.apps.create(org.id, 'Acme')
```

## Adding new models

1. Create a SQLAlchemy model in `models/`.
2. Add a service in `services/` for the database operations.
3. Export the model and service in `src/db/__init__.py`.
