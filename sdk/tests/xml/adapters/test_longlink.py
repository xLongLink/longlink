import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Longlink.xsd"


def test_longlink_layout_validation() -> None:
    """Validate a minimal `longlink` layout fragment."""

    element = Element.from_content('<longlink><P i18n="Dashboard" /></longlink>', schema=SCHEMA)
    element.validate()


def test_longlink_layout_allows_nested_children() -> None:
    """Allow nested XML children inside `longlink`."""

    element = Element.from_content(
        '<longlink><State id="filters" value="[]" /><Query id="projects" path="/projects" /></longlink>',
        schema=SCHEMA,
    )
    element.validate()


def test_longlink_layout_allows_metadata_attributes() -> None:
    """Allow `name` and `icon` attributes on `longlink`."""

    element = Element.from_content(
        '<longlink name="dashboard" icon="layout-dashboard"><P i18n="Dashboard" /></longlink>',
        schema=SCHEMA,
    )
    element.validate()


def test_longlink_layout_rejects_unknown_root_attributes() -> None:
    """Reject unsupported attributes on `longlink`."""

    element = Element.from_content(
        '<longlink hidden="true"><P i18n="Dashboard" /></longlink>',
        schema=SCHEMA,
    )

    with pytest.raises(ValueError):
        element.validate()


def test_longlink_layout_rejects_malformed_xml() -> None:
    """Normalize malformed XML syntax failures as validation errors."""

    element = Element.from_content('<longlink><P i18n="Dashboard"></longlink>', schema=SCHEMA)

    with pytest.raises(ValueError, match="XML syntax is invalid"):
        element.validate()
