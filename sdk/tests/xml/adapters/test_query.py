import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Query.xsd"


def test_query_layout_validation() -> None:
    """Validate a minimal `Query` layout fragment."""

    element = Element.from_content('<Query id="projects" path="/projects" />', schema=SCHEMA)
    element.validate()


def test_query_layout_rejects_nested_content() -> None:
    """Reject nested XML content inside `Query`."""

    element = Element.from_content('<Query id="projects" path="/projects"><item /><meta /></Query>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_query_layout_requires_path() -> None:
    """Reject a `Query` fragment missing its required path."""

    element = Element.from_content('<Query id="projects" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_query_layout_requires_id() -> None:
    """Reject a `Query` fragment missing its required id."""

    element = Element.from_content('<Query path="/projects" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()
