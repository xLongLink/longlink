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
