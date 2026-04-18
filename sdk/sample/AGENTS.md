## Architecture

You are working on a LongLink application. LongLink

```
├── app/
│   ├── models/       # SQLAlchemy models
│   ├── routes/       # FastAPI routes
│   ├── types/        # Pydantic types
│   ├── pages/        # XML page definitions
│   ├── utils/        # Shared helper utilities
│   └── envs.py       # Environment and settings helpers
├── tests/
│   ├── routes/       # Route tests
│   └── conftest.py   # Test fixtures
├── main.py           # Application entry
├── pyproject.toml    # Project configuration
└── .env.sample       # Environment template
```
