# Office Operations

## App

- The app has Dashboard, Requests, and Settings tabs to show normal XML page navigation.
- Purchase requests use an application database table and LongLink-managed audit users.
- The request list and `requests/[request].xml` detail page demonstrate filename-based dynamic XML routing.
- Attachments upload, list, download, and delete Application files through `longlink.storage`.
- LongLink scopes Application files beneath the Organization bucket automatically.
- Approval actions update request workflow status through typed FastAPI endpoints.
- Settings demonstrates local XML state, menus, text, avatar, and form controls.

## JSX Pages

Add `.jsx` files under `src/pages` to render ordinary React components in the LongLink Application shell. LongLink transpiles the source in the browser and provides active Astryx components through `@ui`.

```jsx
import { Button, Heading, Stack, Text } from "@ui";

export default function Reports() {
  return (
    <Stack gap={4}>
      <Heading level={1}>Reports</Heading>
      <Text>Render Application-specific React logic here.</Text>
      <Button>Refresh</Button>
    </Stack>
  );
}
```

JSX pages may import only from `@ui`. Declare a named default function, or an `App` function, as the page component.

## Start

```bash
uv sync
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
