import re
from lxml import etree
from functools import cache
from longlink.constants import ROOT

UNSUPPORTED_XML_MARKUP_PATTERN = re.compile(r"<!\s*DOCTYPE\b|<!\[CDATA\[", re.IGNORECASE)


@cache
def _load_xml_schema() -> etree.XMLSchema:
    """Compile and cache the bundled XML schema."""

    # Load bundled schemas with external entities and network access disabled.
    return etree.XMLSchema(
        etree.parse(
            str(ROOT / ".static" / "xsd" / "schema.xsd"),
            etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False),
        )
    )


def validate_xml(content: str) -> etree._Element:
    """Validate XML content against the bundled XSD schema."""

    # Reject XML constructs that the web runtime parser does not support.
    if UNSUPPORTED_XML_MARKUP_PATTERN.search(content):
        raise ValueError("XML DOCTYPE and CDATA constructs are not supported")

    # Parse user XML once for validation and downstream metadata extraction.
    try:
        xml_doc = etree.XML(content.encode("utf-8"), etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False))
    except etree.XMLSyntaxError as error:
        raise ValueError(f"XML syntax is invalid: {error}") from error

    # Reuse the compiled schema while surfacing validation details from this document.
    try:
        _load_xml_schema().assertValid(xml_doc)
    except etree.DocumentInvalid as error:
        details = "; ".join(f"Line {entry.line}: {entry.message}" for entry in error.error_log)
        raise ValueError(f"XML is invalid: {details}") from error

    return xml_doc
