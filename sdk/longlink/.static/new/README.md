# Minimal LongLink showcase app

## Showcase

- Inventory uses an application database table and LongLink-managed users.
- Documents uploads, lists, downloads, and deletes files through `longlink.fs` in the app-dedicated storage bucket.
- Form, cart, quote, menu, and text pages demonstrate XML UI components and actions.

## Start

```bash
uv sync
uv run longlink dev
```

## Migrate

```bash
uv run longlink migrate
```

## Build

```bash
uv run longlink build
uv run longlink build --registry localhost:15000 --push --tag dev
```
