# LongLink XML Schema

This document describes the packaged XML schema used by the LongLink SDK and runtime.

## Usage

- Root documents use `<Page>`.
- `bind:` is the only supported namespace prefix and is reserved for schema-backed bindings.
- Declare it as `xmlns:bind="https://longlink.dev/xml/bind"` on the root `<Page>` element when using bound attributes.
- Keep element names, attribute names, and nesting exactly as defined by the packaged XSD.
- Treat `sdk/longlink/.static/xsd/schema.xsd` as the source of truth.

## Schema Source

The combined schema is assembled in `sdk/longlink/.static/xsd/schema.xsd` from:

- `base.xsd`
- `layout/Page.xsd`
- `layout/State.xsd`
- `layout/For.xsd`
- `layout/Query.xsd`
- `layout/Grid.xsd`
- `html/blockquote.xsd`
- `html/h1.xsd`
- `html/h2.xsd`
- `html/h3.xsd`
- `html/h4.xsd`
- `html/li.xsd`
- `html/p.xsd`
- `html/ul.xsd`
- `components/Card.xsd`
- `components/CardAction.xsd`
- `components/CardContent.xsd`
- `components/CardDescription.xsd`
- `components/CardFooter.xsd`
- `components/CardHeader.xsd`
- `components/CardTitle.xsd`
- `components/Column.xsd`
- `components/Columns.xsd`
- `components/Dialog.xsd`
- `components/DialogContent.xsd`
- `components/DialogDescription.xsd`
- `components/DialogFooter.xsd`
- `components/DialogHeader.xsd`
- `components/DialogTitle.xsd`
- `components/DialogTrigger.xsd`
- `components/Hero.xsd`
- `components/Menu.xsd`
- `components/MenuSection.xsd`
- `components/MenuSubSection.xsd`
- `components/Stack.xsd`
- `components/Tabs.xsd`
- `components/TabsContent.xsd`
- `components/TabsList.xsd`
- `components/TabsTrigger.xsd`
- `components/Button.xsd`
- `components/Checkbox.xsd`
- `components/Icon.xsd`
- `components/Input.xsd`
- `components/Range.xsd`
- `components/Select.xsd`
- `components/Separator.xsd`
- `components/Slider.xsd`
- `components/Switch.xsd`
- `components/Textarea.xsd`
- `tables/Table.xsd`
- `tables/TableBody.xsd`
- `tables/TableCell.xsd`
- `tables/TableHead.xsd`
- `tables/TableHeader.xsd`
- `tables/TableRow.xsd`

## Element Families

- Layout: `Page`, `State`, `For`, `Query`, `Grid`
- HTML: `blockquote`, `h1`, `h2`, `h3`, `h4`, `li`, `p`, `ul`
- Components: `Card`, `CardAction`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`, `Column`, `Columns`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DialogTrigger`, `Hero`, `Menu`, `MenuSection`, `MenuSubSection`, `Stack`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Button`, `Checkbox`, `Icon`, `Input`, `Range`, `Select`, `Separator`, `Slider`, `Switch`, `Textarea`
- Tables: `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`

## Core Rules

- `<Page>` requires `name` and accepts optional `icon` and any schema-lax attributes.
- `<Page>` can contain any allowed child element from the packaged schema.
- `<State>` requires `id` and can contain any nested page content.
- `Query` is the data-loading primitive.
- `For` handles repetition over collections.
- Components provide reusable UI structure and controls.
- HTML tags provide plain rich text structure.
- Action-capable components may use `action`, `path`, or `url` for the target, `method` for the HTTP verb, `payload` or `body` for data, `invalidate` to refresh query keys, and `onSuccess` for follow-up behavior.
- `Input` and `Select` also support `submit` for inline submission flows.

## Example

```xml
<Page name="dashboard" icon="layout-dashboard" xmlns:bind="https://longlink.dev/xml/bind">
  <State id="filters">
    <Query id="orders" path="/orders" />
  </State>
</Page>
```
