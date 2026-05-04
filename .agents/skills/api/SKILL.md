---
name: api
description: Explain LongLink control-plane API structure, conventions, testing, and documentation
license: MIT
compatibility: opencode
metadata:
  audience: contributors
  workflow: backend
---

## What I do

- Explain how the control-plane API is organized across auth, db, models, routes, templates, and XML pages
- Describe the API design rules for FastAPI, Pydantic, enums, and boundary validation
- Summarize the API testing approach and where backend behavior is exercised
- Point to the repository docs that define control-plane responsibilities

## How the API is structured

- `api/src/routes/` holds route handlers and should stay focused on orchestration.
- `api/src/db/` contains persistence, sessions, and service-layer code.
- `api/src/models/` defines domain models.
- `api/src/templates/` stores Kubernetes and infrastructure templates.
- `api/src/pages/` contains XML pages exposed through the control plane UI.
- Keep validation at the schema boundary and reuse shared enums and Pydantic models.

## How it is tested

- API behavior is covered in `api/tests/`.
- Prefer validating request and response boundaries through the FastAPI app and the relevant service layer.
- When changing schema or parsing logic, ensure the external payload is normalized once at the edge and exercised through the existing test flow.

## How it is documented

- The control-plane responsibilities are summarized in `api/CONTRIBUTING.md` and the root `CONTRIBUTING.md`.
- Keep behavior aligned with the folder architecture and the documented conventions for enums, schemas, and route handlers.

## When to use me

Use this when you need to understand, explain, or extend the LongLink control-plane API.
