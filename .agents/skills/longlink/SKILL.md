---
name: longlink
description: LongLink SDK and XML element guide
---

LongLink combines a Python SDK for application setup with a declarative XML runtime for pages and UI behavior.

## Use For

- Starting a new LongLink app with the SDK
- Configuring environments, routes, storage, and database access
- Writing XML pages and components
- Understanding the core XML elements and their runtime behavior

## SDK

The SDK provides the application entry point, CLI commands, storage helpers, database helpers, and XML schema assets.

```python
from longlink import Environments, LongLink


class Env(Environments):
    """Project-specific environment model."""

    KEY: str = "longlink"


env = Env()
app = LongLink(env=env)
```

- Use `Environments` for validated configuration.
- Use `LongLink` to construct the app runtime.
- Use `Router` for API route registration.
- Use `fs` for storage access.
- Use `db` for SQLModel-based tables and sessions.

## XML Elements

LongLink XML is declarative and schema-driven. Pages usually start with `<longlink>`.

```xml
<longlink>
  <State id="cart" value="[]" />
  <Query id="products" path="/api/products" />
  <For each="$products.items" as="product">
    <Action action="/cart/add" method="POST" json="${{ productId: product.id }}">
      Add
    </Action>
  </For>
</longlink>
```

### Core Elements

- `<longlink>`: root page shell.
- `<State>`: local reactive state.
- `<Query>`: fetches JSON data into a named slot.
- `<For>`: iterates over arrays in a scoped child context.
- `<Action>`: submits requests and can invalidate data after success.
- `if="..."`: conditional rendering available on any element.

### Expression Rules

- Use plain text, `$references`, or `${expressions}`.
- Use object-literal expressions for JSON payloads.
- Do not author bare `{name}` or `{{...}}` syntax.

## Structure

```text
longlink/
├── sdk/           # Python SDK, CLI, storage, database, and XML schema assets
├── web/           # XML runtime and frontend renderer
├── api/           # Control plane and XML pages
└── docs/          # Documentation
```

## When Editing

- Keep SDK examples aligned with the public Python API.
- Keep XML examples aligned with the runtime tags and expression rules.
- Update this skill when SDK entry points or XML elements change.
