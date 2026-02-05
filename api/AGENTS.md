## AGENTS.md

You are working on the backend. Is a FastAPI application that handles authentication, permissions, and routing to various modules.

## Project Structure

```txt
main.py  # App entrypoint
alembic  # DB migrations
├── env.py
└── versions/
src/
├── auth.py    # Global Auth setup
├── logger.py  # Global logger setup
├── router.py  # App router
├── routes/    # HTTP layer only
├── types/     # Pydantic models
├── utils/     # Pure helpers
└── db/        # ORM models (DB)
    ├── session.py  # DB session management
    ├── models/     # DB-related services
    └── functions/  # DB logic layer
tests/
```

## Python Guidelines

- Strict typing
- API-first design
- Explicit dependencies
- Clear separation of concerns
- Sort imports alphabetically by length, for example:

```python
import os
import sys
from src.db import *
from fastapi import *
from src.auth import *
```

- Use single quotes for strings

## Database Layer

Define pydantic models in `src/db/models/` and database utility functions in `src/db/services/`.
Finally import both the models (for type hinting) and the services (for DB operations) in `src/db/__init__.py` for easy access.
In the rest of the application, import the database layer as follows:

```python
import src.db as db
```
