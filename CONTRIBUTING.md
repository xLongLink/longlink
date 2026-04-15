# Contributing to LongLink

Thanks for contributing.

This guide explains the essentials so you can move quickly without breaking the platform model.

## Before you start

- Read `AGENTS.md` in the folder you are changing.
- Keep the current architecture direction.
- Prefer the current development model over backward compatibility.

## Project map

- `api/` → Control plane (auth, permissions, lifecycle, orchestration)
- `sdk/` → Python SDK for application development
- `web/` → Frontend runtime and control-plane UI integration
- `xml/` → ReactXML runtime (XML to React rendering)
- `docs/` → Platform and SDK documentation

Each area has its own local `CONTRIBUTING.md` with focused rules.

## Quick setup

```bash
uv venv
source .venv/bin/activate
uv pip install -e './api[dev]'
uv pip install -e './sdk'
bun --cwd=web install
```

## Working style

- Keep changes small and clear.
- Remove obsolete code when replacing old flows.
- Keep responsibilities separated:
  - Control plane handles governance/infrastructure concerns.
  - Applications handle business logic.
  - Web and XML layers render UI/runtime behavior.

## Formatting

When you are done:

```bash
make format
```

## Pull requests

A good PR should:

- explain what changed
- explain why it changed
- mention any architectural impact
- include validation steps you ran
