# Minimal LongLink showcase app

## Setup with uv (preferred)

```bash
uv sync
```

Start the app in development mode:

```bash
uv run longlink dev
```

Translation catalogs live in `src/i18n/` and are served from `/i18n/<lang>.json`.

Build the application using Docker:

```bash
uv run longlink build
```
