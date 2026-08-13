import re
from lxml import etree
from pathlib import Path
from functools import cache
from longlink.constants import ROOT

UNSUPPORTED_XML_MARKUP_PATTERN = re.compile(r"<!\s*(?:DOCTYPE|ENTITY)\b|<!\[CDATA\[", re.IGNORECASE)


def create_xml_parser() -> etree.XMLParser:
    """Create an XML parser with external entity resolution disabled."""

    return etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False)


@cache
def load_xml_schema(schema_path: Path) -> etree.XMLSchema:
    """Compile and cache one trusted XSD schema by its resolved path."""

    # Load bundled schemas with external entities and network access disabled.
    parser = create_xml_parser()
    schema_doc = etree.parse(str(schema_path), parser)
    return etree.XMLSchema(schema_doc)


class Element:
    """Load XML content from disk and validate it against an XSD schema."""

    def __init__(self, path: str | Path) -> None:
        """Store file paths and defer parsing until needed."""

        self.path = Path(path)
        self._content: str | None = None


    @property
    def content(self) -> str:
        """Return the raw XML payload."""

        # Cache disk content after the first read.
        if self._content is None:

            # Read XML as text so parse errors can report the original content.
            self._content = self.path.read_text(encoding="utf-8")
        return self._content


    def validate(self) -> etree._Element:
        """Validate and return the parsed XML document."""

        # Reject XML constructs that the web runtime parser does not support.
        if UNSUPPORTED_XML_MARKUP_PATTERN.search(self.content):
            raise ValueError("XML DOCTYPE, ENTITY, and CDATA constructs are not supported")

        # Reuse the compiled schema while parsing user XML with external access disabled.
        parser = create_xml_parser()
        schema = load_xml_schema((ROOT / ".static" / "xsd" / "schema.xsd").resolve())

        # Parse user XML once for validation and downstream metadata extraction.
        try:
            xml_doc = etree.XML(self.content.encode("utf-8"), parser)
        except etree.XMLSyntaxError as error:
            raise ValueError(f"XML syntax is invalid: {error}") from error

        # Surface schema validation details instead of a generic lxml failure.
        if not schema.validate(xml_doc):
            messages = [f"Line {error.line}: {error.message}" for error in schema.error_log]
            raise ValueError("XML is invalid: " + "; ".join(messages))

        return xml_doc
