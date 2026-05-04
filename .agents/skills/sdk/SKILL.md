---
name: sdk
description: Explain LongLink SDK structure, component model, testing, and documentation
license: MIT
compatibility: opencode
metadata:
  audience: contributors
  workflow: backend
---

## What I do

- Explain how the SDK is organized across app code, routes, types, storage, database, and utilities
- Describe how SDK XML pages and runtime assets fit into the package layout
- Summarize the SDK testing approach and where unit and XML tests live
- Point to the documentation and contributing rules that govern SDK changes

## How the SDK is structured

- `sdk/longlink/` is the core SDK package.
- `sdk/longlink/app.py` provides the FastAPI app factory.
- `sdk/longlink/routes/` holds API routes and `sdk/longlink/types/` holds shared data types.
- `sdk/longlink/storage/` abstracts storage behavior and should stay provider-agnostic.
- `sdk/longlink/.static/` contains packaged assets and XML schema files.
- `sdk/tests/` contains the test suites, including XML runtime and component coverage.

## How it is tested

- SDK behavior is covered in `sdk/tests/`.
- XML runtime and component behavior lives under `sdk/tests/xml/`.
- Utility and CLI behavior live under their respective test directories.
- Keep changes explicit and verify they still map cleanly to FastAPI, SQLAlchemy, Alembic, and Pydantic patterns.

## How it is documented

- The primary SDK guidance is in `sdk/CONTRIBUTING.md`.
- The root `CONTRIBUTING.md` describes the overall repository layout and development flow.
- XML schema references are packaged under `sdk/longlink/.static/xsd/` and surfaced through the docs site.

## When to use me

Use this when you need to understand, explain, or extend the LongLink SDK.
