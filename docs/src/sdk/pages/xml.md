# XML Pages

LongLink pages are defined in XML.

The SDK no longer provides Python UI component classes.
The backend returns XML page schemas, and the web layer renders them.

## Page structure

Each page file must contain a `<Page>` root element.

```xml
<Page name="Issues" icon="bug">
  <Hero title="Issues" subtitle="Track open work" />
</Page>
```

## Registration

Register the XML file from Python with `xml_page(...)`.

```py
from pathlib import Path
from longlink import xml_page

PAGES_DIR = Path(__file__).parent / "pages"

xml_page("/issues", schema_path=PAGES_DIR / "issues.xml")
```

When `name` and `icon` are omitted, the SDK reads both values from the XML root element.

## Notes

- The route returns the XML page schema as JSON.
- Page metadata must include both `name` and `icon`.
- Use XML files as the single source of truth for page structure.
