# LongLink Web

Frontend runtime, docs, and control-plane UI for LongLink.

## Development

```bash
bun install
bun run dev
```

Set `VITE_API_URL` to the deployed API origin before running the app.

## Scripts

```bash
bun run build:api
bun run build:sdk
bun run lint
bun run test
bun run format
```

## Notes

- `build:api` builds the control-plane bundle.
- `build:sdk` builds the SDK bundle.
- The app uses shadcn/ui primitives and the shared XML runtime under `src/xml/`.
