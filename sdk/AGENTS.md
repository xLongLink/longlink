# AGENTS.md

This folder contains the LongLink Python SDK, the folder contains:

- `tests` - Unit tests for the SDK
- `longlink` - Core SDK code
- `sample` - Sample projects using the SDK

You can install the SDK locally in development mode with the following command:

```bash
uv pip install -e './sdk'
```

## Tests

To run the unit tests, use the following command:

```bash
pytest tests
```

## SDK

The sdk folder contains the code to create a LongLink application. Each repository shall create a single application, therefore there is no need for
