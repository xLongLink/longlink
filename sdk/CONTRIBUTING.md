# Contributing in `sdk/`

Thanks for contributing to the Python SDK.

## Architecture

```
sdk/
├── longlink/           # Core SDK code
├── sample/           # Sample applications
└── tests/           # Unit tests
```

## What this folder owns

The SDK defines how applications are built on LongLink.

## Keep changes aligned

- Keep the SDK opinionated and consistent.
- Prefer simple, explicit APIs.
- Remove obsolete code when replacing behavior.
- Do not add tests right now (project rule in current phase).

## Useful commands

Install SDK in editable mode:

```bash
pip install -e './sdk'
```

Format imports before PR:

```bash
python -m isort .
```
