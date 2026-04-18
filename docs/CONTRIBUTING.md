# Contributing in `docs/`

Thanks for improving LongLink documentation.

## Architecture

```text
docs/
├── src/
│   ├── api/           # Control plane API documentation
│   ├── sdk/           # Application SDK documentation
│   ├── public/        # Public assets
│   └── index.md       # Documentation entry
└── .vitepress/        # VitePress configuration
```

## Goal

Write docs clear, direct, easy to translate.

## Writing rules

- Use short, concrete sentences.
- Prefer explicit nouns over ambiguous pronouns.
- Avoid marketing language.
- Explain responsibilities clearly (control plane vs SDK vs application).
- Use consistent terms (`application`, `control plane`, `SDK`, `API`, `XML page`).
- Avoid unnecessary jargon; explain specialized terms briefly.

## LongLink architecture language

- Control plane manages identity, permissions, provisioning, isolation, lifecycle, secure proxy.
- Applications SDK defines backend using FastAPI + SQLAlchemy/Alembic/fsspec + XML UI definitions.
- Web layer renders XML-defined UI and communicates with APIs.

Describe ownership explicitly. Avoid ambiguous `we`.
Use `You` for reader actions and `LongLink` for platform behavior.

## Recommended page structure

When relevant, include:

1. What resource/feature is for
2. Available methods
3. Request models/parameters
4. Returned models
5. Minimal usage examples

## Step-by-step guidance

Tutorials should go from first contact to running application end to end.
Do not skip required steps.

Typical sequence:

1. Create application
2. Define data model
3. Run migrations
4. Implement API endpoints
5. Define XML pages
6. Deploy application
7. Access application in web interface

## VitePress containers

Supported custom containers:

- `info`
- `tip`
- `warning`
- `danger`
- `details`
