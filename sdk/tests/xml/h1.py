from lxml import etree
from pathlib import Path


def test_h1_page_validation(tmp_path: Path) -> None:
    """Validate an XML fragment against the h1 schema."""

    # Write a minimal XML fragment that exercises only the <h1> element.
    xml_path = tmp_path / "h1.xml"
    xml_path.write_text(
        """<h1>Heading one</h1>
""",
        encoding="utf-8",
    )

    schema_path = Path(__file__).resolve().parents[2] / "longlink" / ".static" / "xsd" / "html" / "h1.xsd"
    schema_root = etree.XML(schema_path.read_bytes())
    schema = etree.XMLSchema(schema_root)
    xml_doc = etree.XML(xml_path.read_bytes())
    schema.assertValid(xml_doc)
