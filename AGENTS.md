# AGENTS.md

ViaVai is composed on a platform and a sdk to create modules for the platform.

## Repository Structure

- `api` - Backend API
- `sdk` - Python SDK for module development
- `web` - Static Frontend web application

## Pre commit

If there were any edits in `web` run:

```bash
bun run lint
bun run build
```

And ensure there are no errors.
