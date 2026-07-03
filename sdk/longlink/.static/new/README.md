# Purchase Requests

## App

- Purchase requests use an application database table and LongLink-managed audit users.
- The request list and `requests/[request].xml` detail page demonstrate filename-based dynamic XML routing.
- Attachments upload, list, download, and delete files through `longlink.fs` in the app-dedicated storage bucket.
- Approval actions update request workflow status through typed FastAPI endpoints.

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
