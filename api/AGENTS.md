## AGENTS.md

## Core Principles

FastAPI should orchestrate, not contain business logic.

- Clear separation of concerns
- Explicit dependencies
- Strict typing
- API-first design
- Framework used at the edges only

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

Sort imports alphabetically by length

```python
import os
import sys
from src.db import *
from fastapi import *
from src.auth import *
```
