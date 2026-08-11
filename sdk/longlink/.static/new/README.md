# Office Operations

## App

- The app has Dashboard, Items, and Settings tabs to show normal XML page navigation.
- Items use an application database table.
- The item catalog and `items/[item].xml` detail page demonstrate filename-based dynamic XML routing.
- Attachments upload and list Application files through `longlink.storage`.
- LongLink scopes Application files beneath the Organization bucket automatically.
- Settings demonstrates local XML state, menus, text, avatar, and form controls.

## Start

```bash
uv sync
uv run longlink migrate
uv run longlink dev
```

## Migrate

Application models use standard SQLModel. Use `database.AuditTable` only when a table needs Platform-user attribution.

Application migrations manage only this application's schema. The LongLink Platform executes the SDK-owned shared migrations for tables such as `audit`; applications can read those tables but cannot write them.

```bash
uv run longlink migrate
```

## Build

```bash
uv run longlink build
uv run longlink build --registry localhost:15000 --push --tag dev
```
