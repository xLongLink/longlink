# Menu

`Menu` builds a navigation-oriented layout with sections and optional subsections.

## What it is for

Use `Menu` for settings-style pages or large interfaces where the user needs to move between major categories.

## Available methods

- `Page.menu()`
- `Menu.section(title, icon=None)`
- `MenuSection.section(title)`
- Root content helpers on `MenuSection`
- Content helpers on `MenuSubSection`

## Request models

### `Menu`

- No public props

### `MenuSection`

- `title`
- `icon`

### `MenuSubSection`

- `title`
- `root`

## Returned models

- `Page.menu()` returns a `Menu`
- `Menu.section(...)` returns a `MenuSection`
- `MenuSection.section(...)` returns a `MenuSubSection`

## Example

```py
from longlink.ui.page import Page

page = Page()
menu = page.menu()

general = menu.section(title="General", icon="settings")
general.input(label="Workspace name", submit="Save")

security = menu.section(title="Security", icon="shield")
auth = security.section("Authentication")
auth.input(label="Allowed domain", submit="Save")
```
