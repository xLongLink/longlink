# Minimal LongLink showcase app

## Setup with uv (preferred)

```bash
uv sync
```

Start the app in development mode:

```bash
uv run longlink dev
```

Translation catalogs live in `src/i18n/` and are served automatically from `/i18n/<lang>.json`.
XML pages live in `src/pages/` and are served automatically from `/pages/<name>.xml`.

The `/pages/inventory.xml` page posts to `POST /inventory` to create an
application-owned inventory row. The SDK fills audit fields from the current
platform user, and the response joins back to the shared organization `User`
table without duplicating user fields on the inventory table.

Build the application using Docker:

```bash
uv run longlink build
```
