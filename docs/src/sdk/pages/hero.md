# Hero

`Hero` renders the primary page or section heading.

## What it is for

Use `Hero` to introduce a page, summarize context, and optionally expose one primary action.

## Available methods

- `Page.hero(title, subtitle=None)`
- `Column.hero(title, subtitle=None)`
- `Tab.hero(title, subtitle=None)`
- `MenuSection.hero(title, subtitle=None)`
- `MenuSubSection.hero(title, subtitle=None)`
- `Card.hero(title, subtitle=None)`
- `Dialog.hero(title, subtitle=None)`
- `Hero.button(text, variant="default", url=None)`

## Request models

- `title`
- `subtitle`
- `icon`

## Returned models

- Container helpers return a `Hero`
- `Hero.button(...)` returns a `Button`

## Example

```py
from longlink.ui.page import Page

page = Page()
hero = page.hero(title="Projects", subtitle="Track delivery")
hero.button(text="Create project", url="/projects/new")
```
