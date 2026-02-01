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

Rule: API → Service → Repository → DB

## `main.py`

`main.py` should:

- Create the FastAPI app
- Register routers
- Configure middleware

## 4. API Layer (`api/`)

- Routers are thin
- Never reuse ORM models as response schemas.
- One purpose per schema
    - `NodeCreate`
    - `NodeUpdate`
    - `NodeRead`
