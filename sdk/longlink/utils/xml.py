import re
from lxml import etree
from functools import cache
from longlink.constants import ROOT

UNSUPPORTED_XML_MARKUP_PATTERN = re.compile(r"<!\s*(?:DOCTYPE|ENTITY)\b|<!\[CDATA\[", re.IGNORECASE)


def _create_xml_parser() -> etree.XMLParser:
    """Create an XML parser with external entity resolution disabled."""

    return etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False)


@cache
def load_xml_schema() -> etree.XMLSchema:
    """Compile and cache the bundled XML schema."""

    # Load bundled schemas with external entities and network access disabled.
    return etree.XMLSchema(etree.parse(str(ROOT / ".static" / "xsd" / "schema.xsd"), _create_xml_parser()))


def validate_xml(content: str) -> etree._Element:
    """Validate XML content against the bundled XSD schema."""

    # Reject XML constructs that the web runtime parser does not support.
    if UNSUPPORTED_XML_MARKUP_PATTERN.search(content):
        raise ValueError("XML DOCTYPE, ENTITY, and CDATA constructs are not supported")

    # Parse user XML once for validation and downstream metadata extraction.
    try:
        xml_doc = etree.XML(content.encode("utf-8"), _create_xml_parser())
    except etree.XMLSyntaxError as error:
        raise ValueError(f"XML syntax is invalid: {error}") from error

    # Reuse the compiled schema only after parsing user XML successfully.
    schema = load_xml_schema()

    # Surface schema validation details instead of a generic lxml failure.
    if not schema.validate(xml_doc):
        raise ValueError("XML is invalid: " + "; ".join(f"Line {error.line}: {error.message}" for error in schema.error_log))

    return xml_doc
