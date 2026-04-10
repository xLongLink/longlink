# Docs Instructions

Follow these rules when writing documentation pages for VitePress in `docs/src`.

## Markdown

- Write standard Markdown that renders cleanly in VitePress.
- Use clear page titles and short sections with meaningful headings.
- Prefer concise documentation focused on the corresponding SDK resource.

## Code Blocks

- Use fenced code blocks with a language identifier whenever possible.
- For syntax-highlighted examples, use VitePress-compatible fenced blocks such as:

````md
```py
from infomaniak import Client
```
````

````

- When highlighting specific lines, use the VitePress line highlight syntax:

```md
```py{3}
client = Client()
user = client.core.user
print(user)
````

````

## Custom Containers

- Use VitePress custom containers for callouts when they improve readability.
- Supported patterns include:

```md
::: info
Reference information.
:::

::: tip
Helpful guidance.
:::

::: warning
Important caveat.
:::

::: danger
Breaking or risky behavior.
:::

::: details
Optional expanded content.
:::
````

## Page Content

Each resource page should usually include:

- what the resource is for
- the available methods
- the request models
- the returned models
- short usage examples when useful

## Structure

- Keep the docs tree aligned with `infomaniak/resources`.
- If a resource exists at `infomaniak/resources/<domain>/<path>`, the doc page must exist at `docs/src/<domain>/<path>.md`.