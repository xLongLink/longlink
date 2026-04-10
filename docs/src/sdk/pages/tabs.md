# Tabs

`Tabs` groups multiple views behind a tab switcher.

## What it is for

Use `Tabs` when related content should share the same page while remaining separated into named sections.

## Available methods

- `Page.tabs(names)`
- `MenuSubSection.tabs(names)`
- `Tabs.tab(name)`

## Request models

### `Tabs`

- `tabs`: ordered list of tab labels

### `Tab`

- `name`: visible tab label

## Returned models

- `Tabs.tab(name)` returns a `Tab`
- Helper methods such as `page.tabs(["Overview", "Activity"])` return a `list[Tab]`

## Example

```py
from longlink.ui.page import Page

page = Page()
overview, activity = page.tabs(["Overview", "Activity"])

overview.hero(title="Overview")
activity.table(data=[{"event": "Signed in"}])
```
