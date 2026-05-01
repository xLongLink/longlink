# HTML Elements

Use HTML-style tags for text content inside XML pages.

These tags map directly to the current web renderer. Use them when the page needs headings, paragraphs, lists, quoted text, or inline code samples.

## Supported elements

- `<h1>` for the main heading inside a section
- `<h2>` for section headings
- `<h3>` for subsection headings
- `<h4>` for field or block headings
- `<p>` for paragraphs
- `<ul>` for unordered lists
- `<li>` for list items
- `<blockquote>` for quoted or highlighted content
- `<code>` for inline or short code snippets

## Example

```xml
<Card>
  <CardHeader>
    <CardTitle>HTML elements</CardTitle>
  </CardHeader>
  <CardContent>
    <h1>Issue details</h1>
    <p>Use explicit HTML-style tags instead of a generic text wrapper.</p>
    <ul>
      <li>Headings define structure</li>
      <li>Paragraphs explain content</li>
      <li>Lists group related points</li>
    </ul>
    <blockquote>Keep page text explicit and readable.</blockquote>
    <code>&lt;h2&gt;Section title&lt;/h2&gt;</code>
  </CardContent>
</Card>
```

## Notes

- Use these tags for content, not for layout.
- Wrap content blocks with layout elements such as `<Card>`, `<Columns>`, or `<Tabs>`.
- The renderer currently supports the elements listed on this page.
