# Pages

The Pages section explains how to define application pages using XML.

The SDK no longer exposes Python UI component classes.
The frontend renders the XML page schema directly.

## Sections

- [XML Pages](/sdk/pages/xml)
- [HTML Elements](/sdk/pages/html-elements)
- [Layout Elements](/sdk/pages/layout/hero)
- [Component Elements](/sdk/pages/components/button)

## Notes

- Define each page in an XML file with a `<Page>` root element.
- Register XML files with `xml_page(...)` or one of the predefined helpers.
- The web frontend is responsible for rendering the XML structure.
- Use HTML-style tags for text content.
- Use layout and component tags for higher-level UI structure.
