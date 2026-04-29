# Dialog

Use `<Dialog>` to render modal content.

The dialog model is composed from dedicated child tags.

## Supported elements

- `<Dialog>`
- `<DialogTrigger>`
- `<DialogContent>`
- `<DialogHeader>`
- `<DialogTitle>`
- `<DialogDescription>`
- `<DialogFooter>`

## Example

```xml
<Dialog id="issue-dialog">
  <DialogTrigger>
    Open details
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Issue details</DialogTitle>
      <DialogDescription>Review the current issue state.</DialogDescription>
    </DialogHeader>
    <p>Dialog content goes here.</p>
  </DialogContent>
</Dialog>
```
