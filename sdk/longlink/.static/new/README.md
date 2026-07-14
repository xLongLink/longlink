# Office Operations

## App

- The app has Dashboard, Requests, and Settings tabs to show normal XML page navigation.
- Purchase requests use an application database table and LongLink-managed audit users.
- The request list and `requests/[request].xml` detail page demonstrate filename-based dynamic XML routing.
- Attachments upload, list, download, and delete files through the app-owned filesystem in `src/resources.py`.
- The dashboard loads the organization logo through `longlink.assets.logo()`, using the SDK fallback locally and the app-owned shared filesystem in production.
- Approval actions update request workflow status through typed FastAPI endpoints.
- Settings demonstrates local XML state, menus, text, avatar, and form controls.

## Start

```bash
uv sync
uv run longlink dev
```

## Migrate

Application migrations manage only this application's schema. The LongLink Platform executes the SDK-owned shared migrations for tables such as `users`; applications can read those tables but cannot write them.

```bash
uv run longlink migrate
```

## Build

```bash
uv run longlink build
uv run longlink build --registry localhost:15000 --push --tag dev
```
