# Stack

`Stack` describes the default vertical flow used by page containers.

::: info
The SDK does not currently expose a dedicated `Stack` Python class. Vertical stacking is the default behavior of containers such as `Page`, `Column`, `Tab`, `MenuSubSection`, `Card`, and `Form`.
:::

## What it is for

Use the default stack flow when components should be rendered one after another from top to bottom.

## Available methods

There is no dedicated `Stack` API. You create a stack implicitly by adding children to a container in order.

## Returned models

There is no standalone `Stack` schema node. The stacking behavior is encoded by the order of `children` inside the parent container.

## Example

```py
from longlink.ui.page import Page

page = Page()
page.hero(title="Users", subtitle="Manage accounts")
page.input(label="Search", placeholder="Search by email")
page.separator()
page.table(data=[{"name": "Alice"}])
```
