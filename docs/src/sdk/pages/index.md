# Pages

The Pages section explains how to define application pages using XML.

The SDK no longer exposes Python UI component classes.
The frontend renders the XML page schema directly.

## Sections

- [XML Pages](/sdk/pages/xml)

## Notes

- Define each page in an XML file with a `<Page>` root element.
- Register XML files with `xml_page(...)` or one of the predefined helpers.
- The web frontend is responsible for rendering the XML structure.
