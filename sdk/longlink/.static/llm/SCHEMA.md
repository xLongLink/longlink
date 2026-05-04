# LongLink XML Schema

This document explains how to write XML that the LongLink SDK accepts.

## How To Use

- Root documents use the `<Page>` element.
- Validate files with the SDK XML runtime before shipping them.
- Keep element and attribute names exactly as defined by the schema.
- Use the `bind:` namespace only for schema-defined bindings.

## Schema Composition

Source: `longlink/.static/xsd/schema.xsd`

The schema is assembled from these files:

- `base.xsd`
- `layout/Page.xsd`
- `layout/State.xsd`
- `layout/For.xsd`
- `layout/Query.xsd`
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
- `layout/Grid.xsd`
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

- `base`
- `Page`
- `State`
- `For`
- `Query`
- `blockquote`
- `h1`
- `h2`
- `h3`
- `h4`
- `li`
- `p`
- `ul`
- `Card`
- `CardAction`
- `CardContent`
- `CardDescription`
- `CardFooter`
- `CardHeader`
- `CardTitle`
- `Column`
- `Columns`
- `Grid`
- `Dialog`
- `DialogContent`
- `DialogDescription`
- `DialogFooter`
- `DialogHeader`
- `DialogTitle`
- `DialogTrigger`
- `Hero`
- `Menu`
- `MenuSection`
- `MenuSubSection`
- `Stack`
- `Tabs`
- `TabsContent`
- `TabsList`
- `TabsTrigger`
- `Button`
- `Checkbox`
- `Icon`
- `Input`
- `Range`
- `Select`
- `Separator`
- `Slider`
- `Switch`
- `Textarea`
- `Table`
- `TableBody`
- `TableCell`
- `TableHead`
- `TableHeader`
- `TableRow`

## Authoring Notes

- `Page` is the top-level document container.
- Layout elements describe structure and data flow.
- Component elements represent reusable UI primitives.
- HTML elements provide basic rich-text content.
- Table elements are used for tabular data layouts.

## Example

```xml
<Page name="dashboard">
  <State id="filters" />
</Page>
```
