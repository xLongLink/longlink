import xmltodict
from lxml import etree
from typing import Any
from pathlib import Path
from longlink.constants import ROOT


class Element:
    """Load XML content from disk and validate it against an XSD schema."""

    def __init__(self, path: str | Path, schema: str | Path | None = None) -> None:
        """Store file paths and defer parsing until needed."""

        self.path = Path(path)
        self.schema_path: Path | None = Path(schema) if schema is not None else ROOT / ".static" / "xsd" / "schema.xsd"
        self._content: str | None = None

    @classmethod
    def from_content(cls, content: str, schema: str | Path | None = None) -> Element:
        """Create an element instance from in-memory XML content."""

        instance = cls.__new__(cls)
        instance.path = Path("<memory>")
        instance.schema_path = Path(schema) if schema is not None else None
        instance._content = content
        return instance

    @property
    def content(self) -> str:
        """Return the raw XML payload."""

        if self._content is None:
            with self.path.open("r", encoding="utf-8") as handler:
                self._content = handler.read()
        return self._content

    def validate(self) -> None:
        """Validate the XML document against the configured XSD schema."""

        parser = etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False)
        schema_doc = etree.parse(str(self._schema_file_path()), parser)
        schema = etree.XMLSchema(schema_doc)

        try:
            xml_doc = etree.XML(self.content.encode("utf-8"), parser)
        except etree.XMLSyntaxError as error:
            raise ValueError(f"XML syntax is invalid: {error}") from error

        if not schema.validate(xml_doc):
            error_log: Any = schema.error_log
            messages = [f"Line {error.line}: {error.message}" for error in error_log]
            raise ValueError("XML is invalid: " + "; ".join(messages))

    def _schema_file_path(self) -> Path:
        """Resolve the XSD file path for validation."""

        if self.schema_path is None:
            raise ValueError("No XSD schema path configured")

        if self.schema_path.is_absolute():
            return self.schema_path

        return ROOT / self.schema_path


class Longlink(Element):
    """Load and validate LongLink XML documents from disk.

    LongLink documents are discovered from XML files and can define custom UI components and interactions.
    """

    def __init__(self, path: str | Path, schema: str | Path | None = None) -> None:
        """Store XML file path and document schema for later parsing operations."""

        default_schema = schema or ROOT / ".static" / "xsd" / "schema.xsd"
        super().__init__(path=path, schema=default_schema)
        self._metadata: dict[str, Any] | None = None

    @property
    def metadata(self) -> dict[str, Any]:
        """Return the parsed XML document as a dict for downstream processing."""

        if self._metadata is None:
            self._metadata = xmltodict.parse(self.content)
        return self._metadata
