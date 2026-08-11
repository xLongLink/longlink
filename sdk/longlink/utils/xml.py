import re
from lxml import etree
from typing import Protocol, cast
from pathlib import Path
from functools import cache
from collections.abc import Iterable
from longlink.constants import ROOT

XSD_NAMESPACE = {"xsd": "http://www.w3.org/2001/XMLSchema"}
UNSUPPORTED_XML_MARKUP_PATTERN = re.compile(r"<!\s*(?:DOCTYPE|ENTITY)\b|<!\[CDATA\[", re.IGNORECASE)


class XmlErrorEntry(Protocol):
    """Describe the lxml validation error fields used in API messages."""

    line: int
    message: str


def create_xml_parser() -> etree.XMLParser:
    """Create an XML parser with external entity resolution disabled."""

    return etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False)


@cache
def known_xml_tags() -> frozenset[str]:
    """Return XML tag names declared by bundled adapter schemas."""

    tags: set[str] = set()
    parser = create_xml_parser()

    # Adapter schemas define the complete XML component surface used by the runtime.
    for schema_path in sorted((ROOT / ".static" / "xsd" / "adapters").glob("*.xsd")):
        schema_doc = etree.parse(str(schema_path), parser)

        # Type-only schemas intentionally contribute no component tags.
        for element in schema_doc.findall("xsd:element", namespaces=XSD_NAMESPACE):
            name = element.get("name")
            if name:
                tags.add(name)

    return frozenset(tags)


@cache
def load_xml_schema(schema_path: Path) -> etree.XMLSchema:
    """Compile and cache one trusted XSD schema by its resolved path."""

    # Load bundled schemas with external entities and network access disabled.
    parser = create_xml_parser()
    schema_doc = etree.parse(str(schema_path), parser)
    return etree.XMLSchema(schema_doc)


class Element:
    """Load XML content from disk and validate it against an XSD schema."""

    def __init__(self, path: str | Path, schema: str | Path | None = None) -> None:
        """Store file paths and defer parsing until needed."""

        self.path = Path(path)
        self.schema_path: Path | None = Path(schema) if schema is not None else ROOT / ".static" / "xsd" / "schema.xsd"
        self._content: str | None = None


    @classmethod
    def from_content(cls, content: str, schema: str | Path | None = None) -> "Element":
        """Create an element instance from in-memory XML content."""

        instance = cls.__new__(cls)
        instance.path = Path("<memory>")
        instance.schema_path = Path(schema) if schema is not None else None
        instance._content = content
        return instance


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
        if self.schema_path is None:
            raise ValueError("No XSD schema path configured")
        schema = load_xml_schema((self.schema_path if self.schema_path.is_absolute() else ROOT / self.schema_path).resolve())

        # Parse user XML once for validation and downstream metadata extraction.
        try:
            xml_doc = etree.XML(self.content.encode("utf-8"), parser)
        except etree.XMLSyntaxError as error:
            raise ValueError(f"XML syntax is invalid: {error}") from error

        # Reject unsupported tags before permissive child wildcards can let them through XSD validation.
        known_tags = known_xml_tags()
        for xml_element in xml_doc.iter():
            tag = xml_element.tag
            if isinstance(tag, str) and tag not in known_tags:
                raise ValueError(f"XML is invalid: Line {xml_element.sourceline}: unsupported XML tag {tag}")

        # Surface schema validation details instead of a generic lxml failure.
        if not schema.validate(xml_doc):
            error_log = cast(Iterable[XmlErrorEntry], schema.error_log)
            messages = [f"Line {error.line}: {error.message}" for error in error_log]
            raise ValueError("XML is invalid: " + "; ".join(messages))

        return xml_doc

class Longlink(Element):
    """Load and validate LongLink XML documents from disk.

    LongLink documents are discovered from XML files and can define custom UI components and interactions.
    """
